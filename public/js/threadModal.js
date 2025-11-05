function viewsLabel(n) { return (Number(n) > 0) ? `Views: ${n}` : ''; }
function commentsLabel(n) { return (Number(n) > 0) ? `${n}` : ''; }
function likesLabel(n) { return (Number(n) > 0) ? `${n}` : ''; }

// Add this at the top to check if user is authenticated
function isUserAuthenticated() {
    // You can check this by looking for authenticated elements or session data
    // This is a simple way to check if the user is logged in
    return document.body.classList.contains('authenticated') ||
        document.querySelector('[data-authenticated="true"]') !== null;
}

function displayThread(thread) {
    const isAuthenticated = isUserAuthenticated();

    const content = `
        <div class="thread-detail" data-thread-id="${thread.thread_id}">
            <!-- Thread Header -->
            <div class="border-b pb-4 mb-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-2">${thread.title}</h1>
                <div class="flex items-center justify-between">
                    <div class="flex items-center text-sm text-gray-500">
                    <img
                        src="${thread.author_avatar_url || (window.DEFAULT_AVATAR_URL || '')}"
                        alt="${thread.username}"
                        class="h-6 w-6 rounded-full object-cover ring-1 ring-gray-200 mr-2"
                    />
                    <span>by <strong>${thread.username}</strong></span>
                    <span class="mx-2">•</span>
                    <time>${new Date(thread.created_at).toLocaleDateString()}</time>
                    </div>

                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                        ${thread.views > 0 ? `
                        <span class="flex items-center">
                            ${viewsLabel(thread.views)}
                        </span>` : ''}

                        ${thread.comments_count > 0 ? `
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            ${thread.comments_count}
                        </span>` : ''}

                        ${thread.total_likes > 0 ? `
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            ${thread.total_likes}
                        </span>` : ''}
                    </div>
                </div>
            </div>

            <!-- Thread Body -->
            <div class="mb-6">
                <div class="prose max-w-none">
                    <p class="text-gray-700 leading-relaxed">${thread.description}</p>
                </div>
                
                <!-- Like Thread Button -->
                <div class="mt-4">
                ${isAuthenticated ?
            `<button onclick="likeThread(${thread.thread_id})"
                             class="cursor-pointer flex items-center space-x-2 px-4 py-2 ${thread.user_liked
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            } rounded-lg transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                      </svg>
                      <span>${thread.user_liked ? 'Liked' : 'Like Thread'} (${thread.likes_count})</span>
                    </button>` :
            `<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                       <p class="text-blue-800 text-sm">
                         <a href="/login" class="font-medium underline">Sign in</a> to like this thread and participate in discussions.
                       </p>
                     </div>`
        }
                </div>
            </div>

            <!-- Comments Section -->
            <div class="border-t pt-6">
                <h3 class="text-lg font-semibold mb-4">Comments (${thread.comments_count})</h3>
                
                <!-- Add Comment Form -->
                ${isAuthenticated ?
            `<div class="mb-6">
                        <form onsubmit="addComment(event, ${thread.thread_id})">
                            <textarea name="comment" rows="3" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="Write a comment..." required></textarea>
                            <button type="submit" 
                                class="cursor-pointer mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        Add Comment
                        </button>
                        </form>
                    </div>` :
            `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p class="text-blue-800 text-sm">
                            <a href="/login" class="font-medium underline">Sign in</a> to add comments to this discussion.
                        </p>
                    </div>`
        }
        <!-- Comments List (nested) -->
        <div id="commentsList" class="space-y-4">
            ${renderCommentsTree(thread.comments || [], isAuthenticated)}
        </div>
  </div>
</div>
`;

    document.getElementById('threadContent').innerHTML = content;
    updateProfileCardCounts(thread);
}

// Add this function to show/hide the small spinner
function showThreadLoadingSpinner() {
    const spinner = document.getElementById('threadLoadingSpinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

function hideThreadLoadingSpinner() {
    const spinner = document.getElementById('threadLoadingSpinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

// show the modal centered (matches inline styles on the modal element)
function openThreadModal() {
    const m = document.getElementById('threadModal');
    if (m) m.style.display = 'block';
}

function closeThreadModal() {
    const m = document.getElementById('threadModal');
    const c = document.getElementById('threadContent');
    if (m) m.style.display = 'none';
    if (c) {
        c.innerHTML = '<div class="flex items-center justify-center py-12"><div class="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div></div>';
    }
    hideThreadLoadingSpinner();
}

function onThreadModalBackdropClick(e) {
    if (e.target && e.target.id === 'threadModal') closeThreadModal();
}

let __loadingThread = false;
function loadThread(threadId) {
  if (__loadingThread) return;              // prevents double fetches
  __loadingThread = true;

  showThreadLoadingSpinner();
  openThreadModal();
  const content = document.getElementById('threadContent');
  if (content) {
    content.innerHTML =
      '<div class="flex items-center justify-center py-12"><div class="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div></div>';
  }

  fetch(`/api/threads/${threadId}`)
    .then(r => r.json())
    .then(data => { if (data?.success) displayThread(data.thread); })
    .finally(() => { hideThreadLoadingSpinner(); __loadingThread = false; });
}

function renderCommentNode(c, isAuthenticated) {
    const avatarSrc = c.avatar_url || window.DEFAULT_AVATAR_URL || '/images/default-avatar.png';
    const bodyText = c.display_body; // already 'deleted' if soft-deleted
    const canReply = isAuthenticated && c.is_deleted === 0;
    const actions = [];

    if (canReply) {
        actions.push(`<button class="cursor-pointer text-blue-600 text-sm hover:underline" onclick="showReplyForm(${c.comment_id})">Reply</button>`);
    }
    if (c.can_edit) {
        actions.push(`<button class="cursor-pointer text-gray-600 text-sm hover:underline" onclick="showEditForm(${c.comment_id}, ${JSON.stringify(c.body ?? '').replace(/"/g, '&quot;')})">Edit</button>`);
    }
    if (c.can_delete) {
        actions.push(`<button class="cursor-pointer text-red-600 text-sm hover:underline" onclick="deleteComment(${c.comment_id})">Delete</button>`);
    }

    // Like button for comments (text-style, aligned with other action links)
    if (isAuthenticated && c.is_deleted === 0) {
        const likeBtn = `
          <button class="cursor-pointer inline-flex items-center gap-1 text-sm ${c.user_liked ? 'text-rose-600 hover:text-rose-700' : 'text-rose-500 hover:text-rose-600'}" onclick="likeComment(${c.comment_id})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <span>${c.likes_count}</span>
          </button>`;
        actions.push(likeBtn);
    }

    const childrenHtml = (c.children || []).map(ch => renderCommentNode(ch, isAuthenticated)).join('');

    return `
  <div class="bg-gray-50 p-4 rounded-lg">
    <div class="flex items-start gap-3 mb-2">
      <img src="${avatarSrc}" alt="${c.username}" class="w-8 h-8 rounded-full object-cover ring-1 ring-gray-300" />
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center text-sm text-gray-500">
            <span class="font-medium text-gray-900">${c.username}</span>
            <span class="mx-2">•</span>
            <time>${new Date(c.created_at).toLocaleDateString()}</time>
          </div>
          <div class="flex items-center gap-3">${actions.join(' ')}</div>
        </div>
  
        <p class="${c.is_deleted ? 'text-gray-500 italic' : 'text-gray-700'} mt-1">
          ${c.is_deleted ? '<span class="font-semibold">deleted</span>' : bodyText}
        </p>
  
        <form class="mt-3 hidden" id="reply-form-${c.comment_id}" onsubmit="submitReply(event, ${c.thread_id}, ${c.comment_id})">
          <textarea name="comment" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Write a reply..." required></textarea>
          <div class="mt-2 flex gap-2">
            <button type="submit" class="cursor-pointer px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Reply</button>
            <button type="button" class="cursor-pointer px-3 py-1.5 border rounded text-sm" onclick="hideReplyForm(${c.comment_id})">Cancel</button>
          </div>
        </form>
  
        <form class="mt-3 hidden" id="edit-form-${c.comment_id}" onsubmit="submitEdit(event, ${c.comment_id})">
          <textarea name="comment" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required></textarea>
          <div class="mt-2 flex gap-2">
            <button type="submit" class="cursor-pointer px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-black text-sm">Save</button>
            <button type="button" class="cursor-pointer px-3 py-1.5 border rounded text-sm" onclick="hideEditForm(${c.comment_id})">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Nested replies -->
    <div class="ml-8 mt-4 space-y-4">
      ${childrenHtml}
    </div>
  </div>`;
}


function renderCommentsTree(comments, isAuthenticated) {
    return comments.map(c => renderCommentNode(c, isAuthenticated)).join('');
}

function showReplyForm(id) { const f = document.getElementById(`reply-form-${id}`); if (f) f.classList.remove('hidden'); }
function hideReplyForm(id) { const f = document.getElementById(`reply-form-${id}`); if (f) f.classList.add('hidden'); }

function showEditForm(id, currentBody) {
    const f = document.getElementById(`edit-form-${id}`);
    if (f) {
        f.classList.remove('hidden');
        const ta = f.querySelector('textarea[name="comment"]');
        if (ta) ta.value = currentBody || '';
    }
}
function hideEditForm(id) { const f = document.getElementById(`edit-form-${id}`); if (f) f.classList.add('hidden'); }

async function submitReply(e, threadId, parentId) {
    e.preventDefault();
    const form = e.target;
    const comment = form.querySelector('textarea[name="comment"]').value;
    try {
        const r = await fetch(`/api/threads/${threadId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment, parent_comment_id: parentId })
        });
        const data = await r.json();
        if (data.success) {
            loadThread(threadId); // reload to refresh tree
        }
    } catch { console.error('submitReply error', err); }
}

async function submitEdit(e, commentId) {
    e.preventDefault();
    const form = e.target;
    const body = form.querySelector('textarea[name="comment"]').value;
    try {
        const r = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body })
        });
        const data = await r.json();
        if (data.success) {
            // Find current thread id from container
            const container = document.querySelector('.thread-detail');
            const threadId = container?.getAttribute('data-thread-id');
            if (threadId) loadThread(threadId);
        }
    } catch { console.error('submitEdit error', err); }
}

async function deleteComment(commentId) {
    if (!confirm('Delete this comment?')) return;
    try {
        const r = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
        const data = await r.json();
        if (data.success) {
            const container = document.querySelector('.thread-detail');
            const threadId = container?.getAttribute('data-thread-id');
            if (threadId) loadThread(threadId);
        }
    } catch { console.error('deleteComment error', err); }
}

async function addComment(e, threadId) {
    e.preventDefault();
    const form = e.target;
    const ta = form.querySelector('textarea[name="comment"]');
    const comment = (ta?.value || '').trim();
    if (!comment) return;

    try {
        const r = await fetch(`/api/threads/${threadId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment }) // top-level comment (no parent_comment_id)
        });
        const data = await r.json();
        if (data.success) {
            ta.value = '';
            loadThread(threadId); // refresh comments
        } else {
            console.error('addComment failed', data.error);
        }
    } catch (err) {
        console.error('addComment error', err);
    }
}

async function likeThread(threadId) {
    try {
        const r = await fetch(`/api/threads/${threadId}/like`, { method: 'POST' });
        if (!r.ok) { console.error('likeThread HTTP', r.status); return; }
        const data = await r.json();
        if (data.success) loadThread(threadId); // refresh counts and button color
    } catch (err) { console.error('likeThread error', err); }
}

async function likeComment(commentId) {
    try {
        const r = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
        if (!r.ok) { console.error('likeComment HTTP', r.status); return; }
        const data = await r.json();
        if (data.success) {
            const container = document.querySelector('.thread-detail');
            const threadId = container?.getAttribute('data-thread-id');
            if (threadId) loadThread(threadId);
        }
    } catch (err) { console.error('likeComment error', err); }
}

function updateProfileCardCounts(thread) {
    const card = document.querySelector(`article[data-thread-id="${thread.thread_id}"]`);
    if (!card) return;
    const v = card.querySelector('.js-thread-views');
    const c = card.querySelector('.js-thread-comments');
    const l = card.querySelector('.js-thread-likes');
    if (v) v.textContent = thread.views;
    if (c) c.textContent = thread.comments_count;
    if (l) l.textContent = thread.likes_count;
}