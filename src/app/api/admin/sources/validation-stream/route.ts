/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { API_CONFIG } from '@/lib/config';

import { AdminSourceApiError, requireSourceAdminConfig } from '../_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const adminConfig = await requireSourceAdminConfig(request);
    const { searchParams } = new URL(request.url);
    const searchKeyword = searchParams.get('q');
    if (!searchKeyword) {
      return NextResponse.json(
        { error: '搜索关键词不能为空' },
        { status: 400 },
      );
    }

    const apiSites = adminConfig.SourceConfig;
    let streamClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const safeEnqueue = (data: Uint8Array) => {
          try {
            if (
              streamClosed ||
              (!controller.desiredSize && controller.desiredSize !== 0)
            ) {
              return false;
            }
            controller.enqueue(data);
            return true;
          } catch (error) {
            console.warn('Failed to enqueue data:', error);
            streamClosed = true;
            return false;
          }
        };

        const startEvent = `data: ${JSON.stringify({
          type: 'start',
          totalSources: apiSites.length,
        })}\n\n`;
        if (!safeEnqueue(encoder.encode(startEvent))) {
          return;
        }

        let completedSources = 0;
        const validationPromises = apiSites.map(async (site) => {
          try {
            const searchUrl = `${site.api}?ac=videolist&wd=${encodeURIComponent(searchKeyword)}`;
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 10000);

            try {
              const response = await fetch(searchUrl, {
                headers: API_CONFIG.search.headers,
                signal: abortController.signal,
              });
              clearTimeout(timeoutId);

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const data = (await response.json()) as any;
              let status: 'valid' | 'no_results' | 'invalid';
              if (
                data &&
                data.list &&
                Array.isArray(data.list) &&
                data.list.length > 0
              ) {
                const validResults = data.list.filter((item: any) => {
                  const title = item.vod_name || '';
                  return title
                    .toLowerCase()
                    .includes(searchKeyword.toLowerCase());
                });
                status = validResults.length > 0 ? 'valid' : 'no_results';
              } else {
                status = 'no_results';
              }

              completedSources++;
              if (!streamClosed) {
                const sourceEvent = `data: ${JSON.stringify({
                  type: 'source_result',
                  source: site.key,
                  status,
                })}\n\n`;
                if (!safeEnqueue(encoder.encode(sourceEvent))) {
                  streamClosed = true;
                  return;
                }
              }
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (error) {
            console.warn(`验证失败 ${site.name}:`, error);
            completedSources++;
            if (!streamClosed) {
              const errorEvent = `data: ${JSON.stringify({
                type: 'source_error',
                source: site.key,
                status: 'invalid',
              })}\n\n`;
              if (!safeEnqueue(encoder.encode(errorEvent))) {
                streamClosed = true;
                return;
              }
            }
          }

          if (completedSources === apiSites.length && !streamClosed) {
            const completeEvent = `data: ${JSON.stringify({
              type: 'complete',
              completedSources,
            })}\n\n`;
            if (safeEnqueue(encoder.encode(completeEvent))) {
              try {
                controller.close();
              } catch (error) {
                console.warn('Failed to close controller:', error);
              }
            }
          }
        });

        await Promise.allSettled(validationPromises);
      },
      cancel() {
        streamClosed = true;
        console.log('Client disconnected, cancelling validation stream');
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    if (error instanceof AdminSourceApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: '验证视频源失败' }, { status: 500 });
  }
}
