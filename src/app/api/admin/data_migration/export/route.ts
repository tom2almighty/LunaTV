/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';
import { promisify } from 'util';
import { gzip } from 'zlib';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { SimpleCrypto } from '@/lib/crypto';
import {
  getAdminConfig,
  getAllFavorites,
  getAllPlayRecords,
  getAllSkipConfigs,
  getAllUsers,
  getSearchHistory,
} from '@/lib/db';
import { getDb } from '@/lib/sqlite';

export const runtime = 'nodejs';

const gzipAsync = promisify(gzip);

export async function POST(req: NextRequest) {
  try {
    // 验证身份和权限
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查用户权限（只有站长可以导出数据）
    if (authInfo.username !== process.env.APP_ADMIN_USER) {
      return NextResponse.json(
        { error: '权限不足，只有站长可以导出数据' },
        { status: 401 },
      );
    }

    const config = await getAdminConfig();
    if (!config) {
      return NextResponse.json({ error: '无法获取配置' }, { status: 500 });
    }

    // 解析请求体获取密码
    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '请提供加密密码' }, { status: 400 });
    }

    // 收集所有数据
    const exportData = {
      timestamp: new Date().toISOString(),
      data: {
        // 管理员配置
        adminConfig: config,
        // 所有用户数据
        userData: {} as { [username: string]: any },
      },
    };

    // 获取所有用户
    let allUsers = await getAllUsers();
    // 添加站长用户
    allUsers.push(process.env.APP_ADMIN_USER);
    allUsers = Array.from(new Set(allUsers));

    // 为每个用户收集数据
    for (const username of allUsers) {
      const userData = {
        // 播放记录
        playRecords: await getAllPlayRecords(username),
        // 收藏夹
        favorites: await getAllFavorites(username),
        // 搜索历史
        searchHistory: await getSearchHistory(username),
        // 跳过片头片尾配置
        skipConfigs: await getAllSkipConfigs(username),
        // 用户密码
        password: await getUserPassword(username),
      };

      exportData.data.userData[username] = userData;
    }

    // 覆盖站长密码
    exportData.data.userData[process.env.APP_ADMIN_USER].password =
      process.env.PASSWORD;

    // 将数据转换为JSON字符串
    const jsonData = JSON.stringify(exportData);

    // 先压缩数据
    const compressedData = await gzipAsync(jsonData);

    // 使用提供的密码加密压缩后的数据
    const encryptedData = SimpleCrypto.encrypt(
      compressedData.toString('base64'),
      password,
    );

    // 生成文件名
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `moontv-backup-${timestamp}.dat`;

    // 返回加密的数据作为文件下载
    return new NextResponse(encryptedData, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': encryptedData.length.toString(),
      },
    });
  } catch (error) {
    console.error('数据导出失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 },
    );
  }
}

// 辅助函数：获取用户密码（通过 SQLite 直接访问）
async function getUserPassword(username: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.get<{ password: string }>(
      'SELECT password FROM users WHERE username = ?',
      username,
    );
    return row?.password || null;
  } catch (error) {
    console.error(`获取用户 ${username} 密码失败:`, error);
    return null;
  }
}
