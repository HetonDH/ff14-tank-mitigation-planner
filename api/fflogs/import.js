let cachedToken = "";
let tokenExpiresAt = 0;

const FFLOGS_TOKEN_URL = "https://www.fflogs.com/oauth/token";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function getCredentials() {
  const clientId = process.env.FFLOGS_CLIENT_ID;
  const clientSecret = process.env.FFLOGS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("缺少 FFLOGS_CLIENT_ID 或 FFLOGS_CLIENT_SECRET 环境变量。");
  }
  return { clientId, clientSecret };
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 5 * 60 * 1000) return cachedToken;

  const { clientId, clientSecret } = getCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(FFLOGS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`FFLogs OAuth 失败：HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("FFLogs OAuth 没有返回 access_token。");
  cachedToken = data.access_token;
  tokenExpiresAt = now + Number(data.expires_in ?? 86400) * 1000;
  return cachedToken;
}

async function graphql(query, variables, region) {
  const token = await getAccessToken();
  const response = await fetch(`https://${region}.fflogs.com/api/v2/client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`FFLogs GraphQL 失败：HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join("；"));
  }
  return result.data;
}

async function getReport(reportCode, region) {
  const query = `
    query GetReport($code: String!) {
      reportData {
        report(code: $code) {
          code
          title
          startTime
          endTime
          fights {
            id
            name
            difficulty
            kill
            startTime
            endTime
            encounterID
            gameZone { id }
          }
          masterData {
            actors(type: "Player") {
              id
              name
              type
              subType
              server
            }
            abilities {
              gameID
              name
              type
              icon
            }
          }
        }
      }
    }
  `;
  const data = await graphql(query, { code: reportCode }, region);
  const report = data?.reportData?.report;
  if (!report) throw new Error("FFLogs 报告不存在或无权访问。");
  return report;
}

async function getDamageTakenEvents(reportCode, start, end, region) {
  const query = `
    query GetEvents($code: String!, $startTime: Float, $endTime: Float, $dataType: EventDataType!, $hostilityType: HostilityType, $includeResources: Boolean, $limit: Int) {
      reportData {
        report(code: $code) {
          events(
            startTime: $startTime
            endTime: $endTime
            dataType: $dataType
            hostilityType: $hostilityType
            includeResources: $includeResources
            limit: $limit
          ) {
            data
            nextPageTimestamp
          }
        }
      }
    }
  `;
  const events = [];
  let currentStart = start;
  let pageCount = 0;

  while (currentStart < end && pageCount < 100) {
    pageCount += 1;
    const data = await graphql(
      query,
      {
        code: reportCode,
        startTime: currentStart,
        endTime: end,
        dataType: "DamageTaken",
        hostilityType: "Friendlies",
        includeResources: true,
        limit: 10000,
      },
      region,
    );
    const page = data?.reportData?.report?.events;
    events.push(...(page?.data ?? []));
    if (page?.nextPageTimestamp && page.nextPageTimestamp < end) {
      currentStart = page.nextPageTimestamp;
    } else {
      break;
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { error: "只支持 GET 请求。" });
    return;
  }

  const reportCode = String(req.query.reportCode ?? "").trim();
  const fightIdParam = req.query.fightId ? String(req.query.fightId) : "";
  const region = String(req.query.region ?? process.env.FFLOGS_REGION ?? "cn").trim() || "cn";

  if (!reportCode) {
    json(res, 400, { error: "缺少 reportCode 参数。" });
    return;
  }

  try {
    let report;
    let resolvedRegion = region;
    try {
      report = await getReport(reportCode, resolvedRegion);
    } catch (error) {
      const fallbackRegion = resolvedRegion === "cn" ? "www" : "cn";
      report = await getReport(reportCode, fallbackRegion);
      resolvedRegion = fallbackRegion;
    }
    const fights = Array.isArray(report.fights) ? report.fights : [];
    if (!fights.length) {
      json(res, 404, { error: "报告中没有战斗记录。" });
      return;
    }

    const fightId = fightIdParam ? Number(fightIdParam) : fights[fights.length - 1].id;
    const fight = fights.find((item) => item.id === fightId);
    if (!fight) {
      json(res, 404, { error: `战斗 #${fightId} 不存在。` });
      return;
    }

    const events = await getDamageTakenEvents(reportCode, fight.startTime, fight.endTime, resolvedRegion);
    json(res, 200, {
      title: `${report.title ?? "FFLogs"} - ${fight.name ?? `战斗 ${fightId}`}`,
      reportCode,
      fightId,
      fightStartTime: fight.startTime,
      region: resolvedRegion,
      events,
      actors: report.masterData?.actors ?? [],
      abilities: report.masterData?.abilities ?? [],
    });
  } catch (error) {
    json(res, 502, { error: error instanceof Error ? error.message : "FFLogs API 调用失败。" });
  }
}
