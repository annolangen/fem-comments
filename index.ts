// Imports
import { render, html } from "lit-html";
import { ref, Ref, createRef } from "lit-html/directives/ref.js";
import data from "./data.json";

/**
 * # Form Submission and Event Handling
 *
 * This app uses lit-html's efficient rendering to update the UI by simply re-rendering
 * the entire body when any event occurs. Most events (click, input) naturally bubble
 * up to our top-level handler which triggers a re-render.
 *
 * ## The Submit Event Exception
 *
 * The submit event is special - its default behavior would:
 * 1. Collect all named form inputs
 * 2. Add their values as URL parameters
 * 3. Reload the page with these parameters
 *
 * We prevent this with e.preventDefault() because we want:
 * - No page reload
 * - No URL parameters
 * - Just our normal re-render
 *
 * ## Why Keep the Form Element?
 *
 * Despite needing to prevent the default submit behavior, we keep <form> elements because they:
 * - Provide semantic structure for screen readers
 * - Enable standard keyboard interactions (Enter to submit)
 * - Group related inputs and actions
 * - Improve accessibility
 */

// Type Definitions
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
  createdAtTs?: number; // Timestamp in milliseconds
  createdAtTextExpiration?: number; // Expiration time for the createdAt text
  score: number;
  user: User;
  replies?: Comment[];
  replyingTo?: string;
  pendingEdit?: boolean;
  pendingReply?: boolean;
}

interface State {
  comments: Comment[];
  currentUser: User;
  requestedDelete?: number | null;
  nextId: number;
}

// Constants
const durationUnits = [
  { name: "year", secs: 365 * 24 * 60 * 60 },
  { name: "month", secs: 30 * 24 * 60 * 60 },
  { name: "week", secs: 7 * 24 * 60 * 60 },
  { name: "day", secs: 24 * 60 * 60 },
  { name: "hour", secs: 60 * 60 },
  { name: "minute", secs: 60 },
  { name: "second", secs: 1 },
];

// State Management
const maxId = (cl: Comment[], max: number) =>
  cl.reduce((max, c) => Math.max(max, maxId(c.replies || [], c.id)), max);

function loadFromData() {
  const state = {
    ...data,
    nextId: maxId(data.comments || [], 0) + 1,
  } as State;
  addTimestamps(state.comments);
  return state;
}

function loadState(): State {
  const stored = localStorage.getItem("commentState");
  if (stored) {
    const loaded = JSON.parse(stored);
    // Ensure nextId is computed from actual comments
    loaded.nextId = maxId(loaded.comments || [], 0) + 1;
    return loaded as State;
  }
  return loadFromData();
}

const saveState = () =>
  localStorage.setItem("commentState", JSON.stringify(state));

const state = window.location.hash === "#reset" ? loadFromData() : loadState();

// Core Business Logic
function parseCreatedAt(str: string): {
  ts: number;
  expiration: number;
} {
  const now = Date.now();
  const match = str.match(/(\d+)\s(\w+)/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    for (const { name, secs } of durationUnits) {
      if (unit.startsWith(name)) {
        return {
          ts: now - value * secs * 1000,
          expiration: now + secs * 1000,
        };
      }
    }
  }
  return { ts: now, expiration: now + 1000 };
}

function addTimestamps(comments: Comment[]) {
  for (const c of comments) {
    if (!c.createdAtTs) {
      const { ts, expiration } = parseCreatedAt(c.createdAt);
      c.createdAtTs = ts;
      c.createdAtTextExpiration = expiration;
    }
    addTimestamps(c.replies || []);
  }
}

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
  saveState();
}

const newComment = (content: string): Comment => ({
  id: state.nextId++,
  content,
  user: state.currentUser,
  createdAt: "now",
  createdAtTs: Date.now(),
  createdAtTextExpiration: Date.now() + 1000,
  score: 0,
});

const replyTo = (c: Comment) =>
  (c.replies ??= []).push({
    ...newComment(""),
    replyingTo: c.user.username,
    pendingReply: true,
  });

const newMessage = (content: string) => {
  state.comments.push(newComment(content));
  saveState();
};

// UI Components (from smallest to largest)
const voteButtonsHtml = (comment: Comment) => html`
  <span
    class="bg-grey-100 rounded-md px-4 py-2 font-medium text-purple-600 hover:text-purple-200 md:flex md:h-20 md:w-8 md:flex-col md:items-center md:gap-2 md:p-0 md:pt-2"
  >
    <button
      aria-label="Upvote comment"
      class="inline"
      @click=${() => {
        comment.score++;
        saveState();
      }}
    >
      <img src="./images/icon-plus.svg" alt="plus" />
    </button>
    <span class="px-2" aria-live="polite">${comment.score}</span>
    <button
      aria-label="Downvote comment"
      class="inline"
      @click=${() => {
        comment.score--;
        saveState();
      }}
    >
      <img src="./images/icon-minus.svg" alt="minus" />
    </button>
  </span>
`;

const actionButtonsHtml = (comment: Comment) =>
  state.currentUser.username === comment.user.username
    ? html`
        <button
          ?disabled=${comment.pendingEdit}
          class="px-2 font-medium text-pink-400 hover:text-pink-200 disabled:cursor-not-allowed disabled:opacity-50"
          @click=${() => (state.requestedDelete = comment.id)}
        >
          <span
            ><img class="inline pr-1" src="./images/icon-delete.svg" />
            Delete</span
          >
        </button>
        <button
          ?disabled=${comment.pendingEdit}
          class="px-2 font-medium text-purple-600 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
          @click=${() => (comment.pendingEdit = true)}
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
  areaRef: Ref<HTMLTextAreaElement> = createRef(),
  prefix: string = comment.replyingTo ? `@${comment.replyingTo} ` : ""
) =>
  comment.pendingEdit
    ? html`<textarea
          name="comment"
          ${ref(areaRef)}
          class="border-grey-100 text-grey-500 col-span-12 row-start-2 mb-2 h-20 w-full rounded-lg border-1 px-6 py-2 md:col-span-11 md:col-start-2"
        >
${prefix}${comment.content}
        </textarea
        >
        <div
          class="col-span-12 row-start-4 flex flex-row justify-end md:col-span-11 md:col-start-2 md:row-start-3"
        >
          <button
            @click=${() => {
              comment.content = areaRef.value!.value.replace(prefix, "");
              comment.pendingEdit = false;
            }}
            class="h-12 rounded-lg bg-purple-600 px-8 text-xl font-medium text-white hover:bg-purple-200"
          >
            Update
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
  onContentChange: (content: string) => void,
  areaRef: Ref<HTMLTextAreaElement> = createRef()
) => html`
  <form
    class="mx-auto flex w-full flex-wrap items-start justify-between gap-2 rounded-md bg-white p-4 md:w-full md:max-w-2xl"
    @submit=${e => {
      // See "Form Submission and Event Handling" comment at top of file
      e.preventDefault();
      onContentChange(areaRef.value!.value);
      areaRef.value!.value = "";
      renderBody();
    }}
    aria-label="Add a comment"
  >
    <div class="w-full md:order-2 md:w-auto md:flex-grow-2">
      <label for="comment-textarea" class="sr-only">Add a comment</label>
      <textarea
        id="comment-textarea"
        ${ref(areaRef)}
        name="comment"
        placeholder="Add a comment..."
        class="border-grey-100 h-20 w-full rounded-lg border-1 px-6 py-2"
        aria-label="Comment text"
      ></textarea>
    </div>
    <img
      class="h-9 w-9 max-w-1/2 md:order-1"
      src=${state.currentUser.image.png}
      alt="Your profile picture"
    />
    <div class="max-w-1/2 md:order-3">
      <button
        type="submit"
        class="h-12 rounded-lg bg-purple-600 px-8 text-xl font-medium text-white hover:bg-purple-200"
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
          @click=${() => (state.requestedDelete = null)}
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
    ? commentInputHtml("REPLY", content => {
        comment.content = content;
        comment.pendingReply = false;
        saveState();
      })
    : html`<div
        class="mx-auto grid w-full grid-cols-12 items-center gap-2 rounded-md bg-white p-4 md:max-w-2xl"
      >
        <img
          class="col-span-2 h-4/5 md:col-span-1 md:col-start-2 md:row-start-1"
          src=${comment.user.image.png}
          alt=""
        />
        <div
          class="col-span-5 font-bold md:col-span-3 md:col-start-3 md:row-start-1"
        >
          ${comment.user.username}
          ${state.currentUser.username === comment.user.username
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
const bodyHtml = () =>
  html` <section
    class="bg-grey-50 flex min-h-screen flex-col gap-2 p-4"
    aria-label="Comments section"
  >
    ${state.comments.map(commentHtml)} ${commentInputHtml("SEND", newMessage)}
    ${state.requestedDelete ? confirmDeleteHtml() : null}
  </section>`;

const renderBody = () => render(bodyHtml(), document.body);

window.onclick = window.oninput = renderBody;
renderBody();
setInterval(renderBody, 1000);
