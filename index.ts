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
    class="grid grid-cols-12 items-center gap-2 rounded-md bg-white p-4 md:max-w-2xl mx-auto"
  >
    <img class="col-span-2 h-4/5 md:col-start-2 md:col-span-1 md:row-start-1" src=${comment.user.image.png} alt="" />
    <div class="col-span-5 font-bold md:col-start-3 md:col-span-3 md:row-start-1">
    ${comment.user.username}
    ${state.currentUser.username === comment.user.username
      ? html` <span
          class="w-10 h-5 rounded-xs bg-purple-600 text-sm leading-none font-bold text-grey-100"
        >
          you
    </span>`
      : null}
      </div>
    <div class="text-grey-500 col-span-5 col-start-8 content-center md:col-start-6 md:col-span-2">
      ${comment.createdAt}
    </div>
    <div class="text-grey-500 col-span-12 row-start-2 mb-2 md:col-start-2 md:col-span-11">
      ${comment.replyingTo
        ? html`<span class="font-bold text-purple-600">
            @${comment.replyingTo}
          </span>`
        : null}
      ${comment.content}
    </div>
    <div
      class="col-span-5 row-start-3 md:col-start-1 md:row-start-1 md:row-span-2 md:self-start"
    >
      <span
        class="bg-grey-100 rounded-md px-4 py-2 font-medium text-purple-600 md:flex md:flex-col md:h-20 md:w-8 md:p-0 md:gap-2 md:pt-2 md:items-center"
      >
        <img class="inline" src="./images/icon-plus.svg" />
        <span class="px-2">${comment.score}</span>
        <img class="inline" src="./images/icon-minus.svg" />
      </span>
    </div>
    <div class="col-span-7 col-start-6 mb-2 text-right md:row-start-1 md:col-start-8">
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
  <div class="border-grey-100 flex flex-col border-l-2 pl-4 md:gap-2">
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
