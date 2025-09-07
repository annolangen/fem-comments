// Imports
import "./index.css";
import { render, html } from "lit-html";
import { store, durationUnits } from "./src/store";
import type { Comment } from "./src/types";

const { getState, subscribe } = store;
const { actions: storeActions } = getState();

if (window.location.hash === "#reset") {
  localStorage.removeItem("comment-state");
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search
  );
}

// Core Business Logic


function createdAtText(c: Comment): string {
  const now = Date.now();
  if (
    c.createdAtTs &&
    c.createdAtTextExpiration &&
    now > c.createdAtTextExpiration
  ) {
    const diff = Math.max(0, Math.floor((now - c.createdAtTs) / 1000));
    for (const { name, secs } of durationUnits) {
      const value = Math.floor(diff / secs);
      if (value >= 1) {
        c.createdAt = `${value} ${name}${value > 1 ? "s" : ""} ago`;
        c.createdAtTextExpiration = now + secs * 1000;
        break;
      }
    }
  }
  return c.createdAt;
}

function deleteRequested() {
  const id = getState().requestedDelete;
  if (id) storeActions.deleteComment(id);
}

const replyTo = (c: Comment) => storeActions.addReply(c.id);

// UI Components (from smallest to largest)
const voteButtonsHtml = (comment: Comment) => html`
  <span
    class="bg-grey-100 rounded-md px-4 py-2 font-medium text-purple-600 hover:text-purple-200 md:flex md:h-20 md:w-8 md:flex-col md:items-center md:gap-2 md:p-0 md:pt-2"
  >
    <button
      aria-label="Upvote comment"
      class="inline"
      @click=${() => storeActions.findAndMutate(comment.id, c => c.score++)}
    >
      <img src="./images/icon-plus.svg" alt="plus" />
    </button>
    <span class="px-2" aria-live="polite">${comment.score}</span>
    <button
      aria-label="Downvote comment"
      class="inline"
      @click=${() => storeActions.findAndMutate(comment.id, c => c.score--)}
    >
      <img src="./images/icon-minus.svg" class="inline" alt="minus" />
    </button>
  </span>
`;

const actionButtonsHtml = (comment: Comment) =>
  getState().currentUser.username === comment.user.username
    ? html`
        <button
          ?disabled=${comment.pendingEdit}
          class="px-2 font-medium text-pink-400 hover:text-pink-200 disabled:cursor-not-allowed disabled:opacity-50"
          @click=${() => storeActions.setRequestedDelete(comment.id)}
        >
          <span
            ><img class="inline pr-1" src="./images/icon-delete.svg" />
            Delete</span
          >
        </button>
        <button
          ?disabled=${comment.pendingEdit}
          class="px-2 font-medium text-purple-600 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
          @click=${() =>
            storeActions.findAndMutate(comment.id, c => (c.pendingEdit = true))}
        >
          <span
            ><img class="inline pr-1" src="./images/icon-edit.svg" /> Edit</span
          >
        </button>
      `
    : html`
        <button
          @click=${() => replyTo(comment)}
          ?disabled=${(comment.replies ?? []).some(r => r.pendingReply)}
          class="px-2 font-medium text-purple-600 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            ><img class="inline pr-1" src="./images/icon-reply.svg" />
            Reply</span
          >
        </button>
      `;

const contentHtml = (
  comment: Comment,
  prefix: string = comment.replyingTo ? `@${comment.replyingTo} ` : ""
) =>
  comment.pendingEdit
    ? html`<textarea
          .value=${prefix + comment.content}
          @input=${(e: Event) =>
            storeActions.findAndMutate(
              comment.id,
              c =>
                (c.content = (e.target as HTMLTextAreaElement).value.replace(
                  prefix,
                  ""
                ))
            )}
          name="comment"
          class="border-grey-100 text-grey-500 col-span-12 row-start-2 mb-2 h-20 w-full rounded-lg border-1 px-6 py-2 md:col-span-11 md:col-start-2"
        ></textarea>
        <div
          class="col-span-12 row-start-4 flex flex-row justify-end md:col-span-11 md:col-start-2 md:row-start-3"
        >
          <button
            @click=${() => {
              // The content is already in the state. Just finalize the edit.
              if (comment.content.trim()) {
                storeActions.findAndMutate(
                  comment.id,
                  c => (c.pendingEdit = false)
                );
              }
            }}
            class="h-12 rounded-lg bg-purple-600 px-8 text-lg font-medium text-white hover:bg-purple-200 md:h-10 md:px-6"
          >
            UPDATE
          </button>
        </div>`
    : html`<div
        class="text-grey-500 col-span-12 row-start-2 mb-2 md:col-span-11 md:col-start-2"
      >
        ${comment.replyingTo
          ? html`<span class="font-bold text-purple-600">
              @${comment.replyingTo}
            </span>`
          : null}
        ${comment.content}
      </div>`;

const commentInputHtml = (
  verb: string,
  onSubmit: () => void,
  value: string,
  onInput: (content: string) => void
) => html`
  <form
    class="mx-auto flex w-full flex-wrap items-start justify-between gap-2 rounded-md bg-white p-4 md:w-full md:max-w-2xl"
    @submit=${e => {
      // See "Form Submission and Event Handling" comment at top of file
      e.preventDefault();
      onSubmit();
    }}
    aria-label="Add a comment"
  >
    <div class="w-full md:order-2 md:w-auto md:flex-grow-2">
      <label for="comment-textarea" class="sr-only">Add a comment</label>
      <textarea
        id="comment-textarea"
        name="comment"
        placeholder="Add a comment..."
        .value=${value}
        @input=${(e: Event) => onInput((e.target as HTMLTextAreaElement).value)}
        class="border-grey-100 h-20 w-full rounded-lg border-1 px-6 py-2"
        aria-label="Comment text"
      ></textarea>
    </div>
    <img
      class="h-9 w-9 max-w-1/2 md:order-1"
      src=${getState().currentUser.image.png}
      alt="Your profile picture"
    />
    <div class="max-w-1/2 md:order-3">
      <button
        type="submit"
        class="h-12 rounded-lg bg-purple-600 px-8 text-lg font-medium text-white hover:bg-purple-200 md:h-10 md:px-6"
      >
        ${verb}
      </button>
    </div>
  </form>
`;

const confirmDeleteHtml = () => html`
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-title"
    aria-describedby="delete-desc"
  >
    <div class="mx-4 max-w-sm rounded-lg bg-white p-6">
      <h2 id="delete-title" class="text-grey-800 text-2xl font-bold">
        Delete comment
      </h2>
      <p id="delete-desc" class="text-grey-500 my-4">
        Are you sure you want to delete this comment? This will remove the
        comment and can't be undone.
      </p>
      <div class="grid grid-cols-2 gap-4 font-medium">
        <button
          @click=${() => storeActions.setRequestedDelete(null)}
          class="bg-grey-500 rounded-lg py-3 text-white hover:opacity-50"
        >
          NO, CANCEL
        </button>
        <button
          @click=${deleteRequested}
          class="rounded-lg bg-pink-400 py-3 text-white hover:opacity-50"
        >
          YES, DELETE
        </button>
      </div>
    </div>
  </div>
`;

const messageHtml = comment =>
  comment.pendingReply
    ? commentInputHtml(
        "SUBMIT",
        () => storeActions.submitReply(comment.id),
        comment.content,
        newContent =>
          storeActions.findAndMutate(comment.id, c => (c.content = newContent))
      )
    : html`<div
        class="mx-auto grid w-full grid-cols-12 items-center gap-2 rounded-md bg-white p-4 md:max-w-2xl"
      >
        <img
          class="col-span-2 h-4/5 md:col-span-1 md:col-start-2 md:row-start-1"
          src=${comment.user.image.png}
          alt=""
        />
        <div
          class="col-span-5 flex items-center gap-2 font-bold md:col-span-3 md:col-start-3 md:row-start-1"
        >
          ${comment.user.username}
          ${getState().currentUser.username === comment.user.username
            ? html` <span
                class="text-grey-100 cursor-not-allowed rounded-xs bg-purple-600 px-1 pt-0.5 pb-1 text-sm leading-none font-bold"
              >
                you
              </span>`
            : null}
        </div>
        <div
          class="text-grey-500 col-span-5 col-start-8 content-center md:col-span-3 md:col-start-6"
        >
          ${createdAtText(comment)}
        </div>
        ${contentHtml(comment)}
        <div
          class="col-span-5 row-start-3 md:col-start-1 md:row-span-2 md:row-start-1 md:self-start"
        >
          ${voteButtonsHtml(comment)}
        </div>
        <div
          class="col-span-7 col-start-6 mb-2 text-right md:col-start-9 md:row-start-1"
        >
          ${actionButtonsHtml(comment)}
        </div>
      </div> `;

const commentHtml = comment => html`
  <article class="comment">
    ${messageHtml(comment)}
    <aside
      class="border-grey-100 mx-auto flex flex-col gap-2 border-l-2 pl-4 md:max-w-2xl"
      aria-label="Replies"
    >
      ${(comment.replies || []).map(commentHtml)}
    </aside>
  </article>
`;

// App Initialization
function bodyHtml() {
  const state = getState();
  return html` <section
    class="bg-grey-50 flex min-h-screen flex-col gap-2 p-4"
    aria-label="Comments section"
  >
    ${state.comments.map(commentHtml)}
    ${commentInputHtml(
      "SEND",
      storeActions.addComment,
      state.newCommentContent,
      storeActions.setNewCommentContent
    )}
    ${state.requestedDelete ? confirmDeleteHtml() : null}
  </section>`;
}

const renderBody = () => render(bodyHtml(), document.body);

// Subscribe to store changes for re-rendering
subscribe(renderBody);

// The `createdAtText` function has internal logic to only update the text
// when needed, so calling `renderBody` frequently is efficient.
setInterval(renderBody, 1000);
