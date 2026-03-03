type UserGroupAction = 'add' | 'edit' | 'delete';

type SubmitUserGroupUpdateParams = {
  action: UserGroupAction;
  groupName: string;
  enabledApis?: string[];
};

type SubmitUserGroupAssignmentsParams = {
  username?: string;
  usernames?: string[];
  userGroups: string[];
};

async function readErrorMessage(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data.error || `操作失败: ${response.status}`;
}

export async function submitUserGroupUpdate({
  action,
  groupName,
  enabledApis,
}: SubmitUserGroupUpdateParams) {
  let endpoint = '/api/admin/user-groups';
  let method: 'POST' | 'PATCH' | 'DELETE' = 'POST';
  let body: Record<string, unknown> | undefined;

  if (action === 'add') {
    body = {
      name: groupName,
      enabledApis: enabledApis || [],
    };
  } else if (action === 'edit') {
    method = 'PATCH';
    endpoint = `/api/admin/user-groups/${encodeURIComponent(groupName)}`;
    body = {
      enabledApis: enabledApis || [],
    };
  } else {
    method = 'DELETE';
    endpoint = `/api/admin/user-groups/${encodeURIComponent(groupName)}`;
  }

  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function submitUserGroupAssignments({
  username,
  usernames,
  userGroups,
}: SubmitUserGroupAssignmentsParams) {
  const response = await fetch('/api/admin/user-groups/assignments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(username ? { username } : {}),
      ...(usernames ? { usernames } : {}),
      userGroups,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}
