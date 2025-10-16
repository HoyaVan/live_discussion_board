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
                                class="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            <span>Like Thread (${thread.likes_count})</span>
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
                                class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
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

                <!-- Comments List -->
                <div id="commentsList" class="space-y-4">
                    ${thread.comments.map(comment => `
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center text-sm text-gray-500">
                                    <span>by <strong>${comment.username}</strong></span>
                                    <span class="mx-2">•</span>
                                    <time>${new Date(comment.created_at).toLocaleDateString()}</time>
                                </div>
                                ${isAuthenticated ?
                `<button onclick="likeComment(${comment.comment_id})" 
                                                    class="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600">
                                                            <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                                            </svg>
                                                            <span>${comment.likes_count}</span>
                                                        </button>` :
                `<span class="text-sm text-gray-400">${comment.likes_count} likes</span>`
            }
                            </div>
                            <p class="text-gray-700">${comment.body}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('threadContent').innerHTML = content;
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
// OPEN → FETCH → RENDER
function loadThread(threadId) {
    // optional: tiny spinner in page
    showThreadLoadingSpinner();

    // open modal immediately
    openThreadModal();

    // ensure a visible spinner is inside the modal while loading
    const content = document.getElementById('threadContent');
    if (content) {
        content.innerHTML =
            '<div class="flex items-center justify-center py-12"><div class="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div></div>';
    }

    fetch(`/api/threads/${threadId}`)
        .then(r => r.json())
        .then(data => {
            hideThreadLoadingSpinner();
            if (data && data.success) {
                displayThread(data.thread);
            } else {
                if (content) content.innerHTML = '<div class="text-center py-8 text-red-600">Error loading thread</div>';
            }
        })
        .catch(err => {
            hideThreadLoadingSpinner();
            if (content) content.innerHTML = '<div class="text-center py-8 text-red-600">Error loading thread</div>';
            console.error('loadThread error', err);
        });
}