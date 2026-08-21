import { get, put } from "@vercel/blob";

const redisKey = "naver-restock-alert:demo-applications:v1";
const blobPath = "state/demo-applications.json";
const localKey = "__NAVER_RESTOCK_APPLICATIONS__";

async function redisCommand(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`REDIS_${response.status}`);
  return response.json();
}

function localApplications() {
  if (!globalThis[localKey]) globalThis[localKey] = [];
  return globalThis[localKey];
}

async function readBlob() {
  try {
    const result = await get(blobPath, { access: "private" });
    if (result?.statusCode !== 200 || !result.stream) return [];
    return JSON.parse(await new Response(result.stream).text());
  } catch (error) {
    if (String(error?.message || error).toLowerCase().includes("not found")) return [];
    throw error;
  }
}

export async function addApplication(application) {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    await redisCommand(["LPUSH", redisKey, JSON.stringify(application)]);
    await redisCommand(["LTRIM", redisKey, "0", "999"]);
    return application;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const applications = await readBlob();
    applications.unshift(application);
    await put(blobPath, JSON.stringify(applications.slice(0, 1000)), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0
    });
    return application;
  }
  localApplications().unshift(application);
  return application;
}

export async function listApplications() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const response = await redisCommand(["LRANGE", redisKey, "0", "999"]);
    return (response?.result || []).map((item) => JSON.parse(item));
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) return readBlob();
  return [...localApplications()];
}
