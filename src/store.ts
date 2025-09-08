import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import data from "../data.json";
import type { AppState, Actions, State, Comment, User } from "./types";

// Constants
export const durationUnits = [
  { name: "year", secs: 365 * 24 * 60 * 60 },
  { name: "month", secs: 30 * 24 * 60 * 60 },
  { name: "week", secs: 7 * 24 * 60 * 60 },
  { name: "day", secs: 24 * 60 * 60 },
  { name: "hour", secs: 60 * 60 },
  { name: "minute", secs: 60 },
  { name: "second", secs: 1 },
];

// State Management with Zustand
const maxId = (cl: Comment[], max = 0): number =>
  cl.reduce((agg, c) => Math.max(agg, maxId(c.replies || [], c.id)), max);

function findComment(comments: Comment[], id: number): Comment | undefined {
  for (const c of comments) {
    if (c.id === id) return c;
    const foundInReplies = findComment(c.replies || [], id);
    if (foundInReplies) return foundInReplies;
  }
  return undefined;
}

const initialCommentsWithTimestamps = structuredClone(data.comments);
addTimestamps(initialCommentsWithTimestamps);

export const initialState: AppState = {
  comments: initialCommentsWithTimestamps,
  currentUser: data.currentUser as User,
  requestedDelete: null as number | null,
  nextId: maxId(initialCommentsWithTimestamps) + 1,
  newCommentContent: "",
};

export function createActions(
  set: (updater: Partial<State> | ((state: State) => Partial<State>)) => void,
  get: () => State
): Actions {
  /** Creates a new comment object with default properties. */
  const createComment = (id: number): Comment => ({
    id,
    content: "",
    user: get().currentUser,
    createdAt: "now",
    createdAtTs: Date.now(),
    createdAtTextExpiration: Date.now() + 1000,
    score: 0,
    replies: [], // New comments/replies start with an empty replies array
  });

  function findAndMutate(id: number, mutator: (c: Comment) => void) {
    const { comments } = get();
    const newComments = structuredClone(comments); // structuredClone is fine for this app's scale
    const comment = findComment(newComments, id);
    if (comment) {
      mutator(comment);
      set({ comments: newComments });
    }
  }

  function deleteComment(idToDelete: number) {
    const { comments } = get();
    const newComments = structuredClone(comments);
    if (findAndRemove(newComments)) {
      set({ comments: newComments, requestedDelete: null });
    }

    function findAndRemove(comments: Comment[]): boolean {
      const index = comments.findIndex(c => c.id === idToDelete);
      if (index !== -1) {
        comments.splice(index, 1);
        return true;
      }
      return comments.some(c => findAndRemove(c.replies || []));
    }
  }

  function submitReply(id: number) {
    const { comments } = get();
    const commentToSubmit = findComment(comments, id);
    // If the reply content is empty, treat it as a "cancel" and remove the pending reply.
    if (commentToSubmit && !commentToSubmit.content.trim()) {
      deleteComment(id); // Direct call, no need for get().actions
      return; // Do not increment nextId
    }
    // Otherwise, finalize the reply.
    findAndMutate(id, c => {
      // Direct call
      c.pendingReply = false;
    });
  }

  function addReply(parentId: number) {
    const { nextId } = get();
    findAndMutate(parentId, parentComment => {
      const newReply: Comment = {
        ...createComment(nextId),
        replyingTo: parentComment.user.username,
        pendingReply: true,
      };
      (parentComment.replies ??= []).push(newReply as Comment);
    });
    set({ nextId: nextId + 1 });
  }

  return {
    findAndMutate,
    deleteComment,
    submitReply,
    addReply,
    setNewCommentContent: (content: string) =>
      set({ newCommentContent: content }),
    addComment: () => {
      const { newCommentContent, nextId, comments } = get();
      const content = newCommentContent.trim();
      if (!content) return;
      set({
        comments: [...comments, { ...createComment(nextId), content }],
        nextId: nextId + 1,
        newCommentContent: "",
      });
    },
    setRequestedDelete: (id: number | null) => set({ requestedDelete: id }),
  };
}

export const store = createStore<State>()(
  persist(
    (set, get) => ({
      ...initialState,
      actions: createActions(set, get),
      getInitialState: () => initialState,
    }),
    {
      name: "comment-state",
      partialize: state => ({
        // Only persist core data, not transient UI state or derived values
        comments: state.comments,
        currentUser: state.currentUser,
      }),
      // After rehydrating, recalculate the nextId to ensure it's always correct.
      // This is more robust than persisting nextId itself.
      onRehydrateStorage: state => {
        if (state) state.nextId = maxId(state.comments) + 1;
      },
    }
  )
);

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
