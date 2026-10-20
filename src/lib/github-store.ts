const API = "https://api.github.com";

export type GitHubStoreTarget = { token: string; owner: string; repo: string };

type GitHubError = Error & { status?: number };

/** Private Contents API. Same defaults as Cover: shamsham2026/hujiang-cover-store. */
export function githubStoreTarget(): GitHubStoreTarget | null {
  const token = process.env.GITHUB_STORE_TOKEN?.trim();
  if (!token) return null;
  const repoEnv = (process.env.GITHUB_STORE_REPO || "hujiang-cover-store").trim();
  const ownerEnv = process.env.GITHUB_STORE_OWNER?.trim();
  if (repoEnv.includes("/")) {
    const slash = repoEnv.indexOf("/");
    const owner = repoEnv.slice(0, slash).trim();
    const repo = repoEnv.slice(slash + 1).trim();
    if (!owner || !repo || repo.includes("/")) return null;
    return { token, owner, repo };
  }
  return { token, owner: ownerEnv || "shamsham2026", repo: repoEnv };
}

export function githubStoreEnabled(): boolean {
  return githubStoreTarget() !== null;
}

function errorMessage(status: number, body: unknown): string {
  const message =
    body && typeof body === "object" && "message" in body
      ? String((body as { message?: unknown }).message || "")
      : "";
  return `GitHub store ${status}${message ? `: ${message}` : ""}`;
}

export function friendlyGitHubError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Bad credentials|401/i.test(msg)) {
    return "GitHub store 認證失敗（GITHUB_STORE_TOKEN 已失效或權限不足）。請在 Vercel → hujiang-admin → Environment Variables 更新 GITHUB_STORE_TOKEN。";
  }
  if (/\b404\b/.test(msg)) return "GitHub store 找不到檔案。";
  if (/\b409\b/.test(msg)) return "GitHub store 寫入衝突，請再試。";
  if (/\b403\b/.test(msg)) return "GitHub store 拒絕寫入。請確認 token 可以寫入 hujiang-cover-store。";
  return msg || "GitHub store 失敗";
}

function asError(status: number, body: unknown): GitHubError {
  const err = new Error(errorMessage(status, body)) as GitHubError;
  err.status = status;
  return err;
}

async function gh(
  target: GitHubStoreTarget,
  pathname: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(
    `${API}/repos/${target.owner}/${target.repo}/contents/${pathname
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${target.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "hujiang-admin",
        ...(init?.headers ?? {}),
      },
    },
  );
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text.slice(0, 200) };
    }
  }
  if (!res.ok) throw asError(res.status, body);
  return body;
}

export type GitHubFile = { text: string; sha: string };

async function readFile(pathname: string): Promise<GitHubFile | null> {
  const target = githubStoreTarget();
  if (!target) return null;
  try {
    const body = await gh(target, pathname);
    if (!body || typeof body !== "object" || !("content" in body)) return null;
    const content = String((body as { content?: unknown }).content ?? "").replace(/\n/g, "");
    const sha = String((body as { sha?: unknown }).sha ?? "");
    if (!sha) return null;
    return { text: Buffer.from(content, "base64").toString("utf8"), sha };
  } catch (err) {
    if ((err as GitHubError).status === 404) return null;
    throw err;
  }
}

async function writeFile(
  pathname: string,
  text: string,
  sha: string | null,
  message: string,
): Promise<string> {
  const target = githubStoreTarget();
  if (!target) throw new Error("GitHub store 未設定");
  const payload: Record<string, string> = {
    message,
    content: Buffer.from(text, "utf8").toString("base64"),
  };
  if (sha) payload.sha = sha;
  const body = await gh(target, pathname, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const content = body && typeof body === "object" ? (body as { content?: { sha?: unknown } }).content : null;
  const next = content && typeof content.sha === "string" ? content.sha : "";
  if (!next) throw new Error("GitHub store 寫入後沒有 sha");
  return next;
}

export const githubStore = {
  read: readFile,
  write: writeFile,
};
