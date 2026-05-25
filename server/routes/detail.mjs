import { json, errorJson } from '../lib/response.mjs';
import { findSource } from '../lib/sources.mjs';
import { createClient, mapDetail } from '../lib/cms.mjs';

export async function fetchDetail(env, sourceId, id) {
  const source = await findSource(env, sourceId);
  if (!source) return null;
  const cms = createClient(env);
  try {
    const detail = await cms.getDetail(id, source);
    if (!detail.success) return null;
    return mapDetail(detail, source, id);
  } catch {
    return null;
  }
}

export async function detail(request, env) {
  const url = new URL(request.url);
  const source = url.searchParams.get('source') || '';
  const id = url.searchParams.get('id') || '';
  if (!source || !id) return errorJson('缺少 source 或 id', 400);
  const data = await fetchDetail(env, source, id);
  if (!data) return errorJson('获取详情失败', 404);
  return json(data);
}
