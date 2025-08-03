import { render, html } from "lit-html";
import data from "./data.json";

interface Image {
  png: string;
  webp: string;
}

interface User {
  image: Image;
  username: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  score: number;
  user: User;
replies?: Comment[];
replyingTo?: string;
}

interface State {
  comments: Comment[];
  currentUser: User;
  requestedDelete?: number | null;
}

// TODO: Consider localStorage
const state = data as State;

// Removes comment with ID to delete from comment or its replies. Returns false, if no comment or reply matches.
function findAndRemove(comments: Comment[], idToDelete: number) {
  const commentIndex = comments.findIndex(c => c.id === idToDelete);
  if (commentIndex > -1) {
    comments.splice(commentIndex, 1);
    return true;
  }

  // If not found, recursively search in the replies of each comment.
  for (const comment of comments) {
    if (findAndRemove(comment.replies || [], idToDelete)) return true;
  }

  return false;
}

function deleteRequested() {
  if (!state.requestedDelete) return;
  findAndRemove(state.comments, state.requestedDelete);
  state.requestedDelete = null;
}

const confirmDeleteHtml = () => html`
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="mx-4 max-w-sm rounded-lg bg-white p-6">
      <h2 class="text-grey-800 text-2xl font-bold">Delete comment</h2>
      <p class="text-grey-500 my-4">
        Are you sure you want to delete this comment? This will remove the
        comment and can't be undone.
      </p>
      <div class="grid grid-cols-2 gap-4 font-medium">
        <button
          @click=${() => (state.requestedDelete = null)}
          class="bg-grey-500 rounded-lg py-3 text-white hover:bg-slate-400"
        >
          NO, CANCEL
        </button>
        <button
          @click=${deleteRequested}
          class="rounded-lg bg-pink-400 py-3 text-white"
        >
          YES, DELETE
        </button>
      </div>
    </div>
  </div>
`;

const messageHtml = comment =>
  html`<div
    class="grid grid-cols-12 items-center gap-2 rounded-md bg-white p-2"
  >
    <img class="col-span-2 h-4/5" src=${comment.user.image.png} alt="" />
    <div class="col-span-3 font-bold">${comment.user.username}</div>
    ${state.currentUser.username === comment.user.username
      ? html` <div
          class="col-span-2 rounded-sm bg-purple-600 pt-0.5 pb-1 pl-[11px] text-sm leading-none font-bold text-white"
        >
          you
        </div>`
      : null}
    <div class="text-grey-500 col-span-5 col-start-8 content-center">
      ${comment.createdAt}
    </div>
    <div class="text-grey-500 col-span-12 row-start-2 mb-2">
      ${comment.replyingTo
        ? html`<span class="font-bold text-purple-600">
            @${comment.replyingTo}
          </span>`
        : null}
      ${comment.content}
    </div>
    <div class="col-span-5 row-start-3">
      <span
        class="bg-grey-100 rounded-md px-4 py-2 font-medium text-purple-600"
      >
        <img class="inline" src="./images/icon-plus.svg" />
        <span class="px-2">${comment.score}</span>
        <img class="inline" src="./images/icon-minus.svg" />
      </span>
    </div>
    <div class="col-span-7 col-start-6 mb-2 text-right">
      ${state.currentUser.username === comment.user.username
        ? html` <button class="px-2 font-medium text-pink-400" @click=${() => {
            state.requestedDelete = comment.id;
          }}>
              <span><img class="inline pr-1" src="./images/icon-delete.svg"> Delete</span>
            </button>
              <button class="px-2 font-medium text-purple-600">
        <span><img class="inline pr-1" src="./images/icon-edit.svg"> Edit<span></button>
      </button>
            `
        : html` 
      <button class="px-2 font-medium text-purple-600">
        <span><img class="inline pr-1" src="./images/icon-reply.svg"> Reply<span></button>
      </button>`}
    </div>
  </div> `;

const commentHtml = comment => html`
  ${messageHtml(comment)}
  <div class="border-grey-100 flex flex-col border-l-2 pl-4">
    ${(comment.replies || []).map(commentHtml)}
  </div>
`;

const bodyHtml = () =>
  html` <div class="bg-grey-50 flex min-h-screen flex-col gap-2 p-4">
    ${state.comments.map(commentHtml)}
    ${state.requestedDelete ? confirmDeleteHtml() : null}
  </div>`;

const renderBody = () => render(bodyHtml(), document.body);

window.onclick = window.onhashchange = window.oninput = renderBody;
renderBody();
