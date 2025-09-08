import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import type { Comment, AppState, Actions, State, VoteDirection } from "./types";

const data = {
  currentUser: {
    image: {
      png: "./images/avatars/image-juliusomo.png",
      webp: "./images/avatars/image-juliusomo.webp",
    },
    username: "juliusomo",
  },
  comments: [
    {
      id: 1,
      content:
        "Impressive! Though it seems the drag feature could be improved. But overall it looks incredible. You've nailed the design and the responsiveness at various breakpoints works really well.",
      createdAt: "1 month ago",
      score: 12,
      user: {
        image: {
          png: "./images/avatars/image-amyrobson.png",
          webp: "./images/avatars/image-amyrobson.webp",
        },
        username: "amyrobson",
      },
      replies: [],
    },
    {
      id: 2,
      content:
        "Woah, your project looks awesome! How long have you been coding for? I'm still new, but think I want to dive into React as well soon. Perhaps you can give me an insight on where I can learn React? Thanks!",
      createdAt: "2 weeks ago",
      score: 5,
      user: {
        image: {
          png: "./images/avatars/image-maxblagun.png",
          webp: "./images/avatars/image-maxblagun.webp",
        },
        username: "maxblagun",
      },
      replies: [
        {
          id: 3,
          content:
            "If you're still new, I'd recommend focusing on the fundamentals of HTML, CSS, and JS before considering React. It's very tempting to jump ahead but lay a solid foundation first.",
          createdAt: "1 week ago",
          score: 4,
          replyingTo: "maxblagun",
          user: {
            image: {
              png: "./images/avatars/image-ramsesmiron.png",
              webp: "./images/avatars/image-ramsesmiron.webp",
            },
            username: "ramsesmiron",
          },
        },
        {
          id: 4,
          content:
            "I couldn't agree more with this. Everything moves so fast and it always seems like everyone knows the newest library/framework. But the fundamentals are what stay constant.",
          createdAt: "2 days ago",
          score: 2,
          replyingTo: "ramsesmiron",
          user: {
            image: {
              png: "./images/avatars/image-juliusomo.png",
              webp: "./images/avatars/image-juliusomo.webp",
            },
            username: "juliusomo",
          },
        },
      ],
    },
  ],
};

export const durationUnits = [
  { name: "year", secs: 365 * 24 * 60 * 60 },
  { name: "month", secs: 30 * 24 * 60 * 60 },
  { name: "week", secs: 7 * 24 * 60 * 60 },
  { name: "day", secs: 24 * 60 * 60 },
  { name: "hour", secs: 60 * 60 },
  { name: "minute", secs: 60 },
  { name: "second", secs: 1 },
];

function maxId(comments: Comment[], currentMax = 0): number {
  return comments.reduce(
    (max, comment) => Math.max(max, maxId(comment.replies || [], comment.id)),
    currentMax
  );
}

function findComment(comments: Comment[], id: number): Comment | undefined {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const found = findComment(comment.replies || [], id);
    if (found) return found;
  }
  return undefined;
}

const initialComments = structuredClone(data.comments);
addTimestamps(initialComments);

export const initialState: AppState = {
  currentUser: data.currentUser,
  comments: initialComments,
  requestedDelete: null,
  nextId: maxId(initialComments) + 1,
  newCommentContent: "",
  userVotes: {},
};

export function createActions(
  set: (updater: Partial<State> | ((state: State) => Partial<State>)) => void,
  get: () => State
): Actions {
  const createComment = (id: number): Omit<Comment, "content"> => ({
    id,
    user: get().currentUser,
    createdAt: "now",
    createdAtTs: Date.now(),
    createdAtTextExpiration: Date.now() + 1000,
    score: 0,
    replies: [],
  });

  function findAndMutate(id: number, mutator: (c: Comment) => void) {
    const { comments } = get();
    const newComments = structuredClone(comments);
    const comment = findComment(newComments, id);
    if (comment) {
      mutator(comment);
      set({ comments: newComments });
    }
  }

  function deleteComment(idToDelete: number) {
    const { comments } = get();
    const newComments = structuredClone(comments);
    if (findAndRemove(newComments, idToDelete)) {
      set({ comments: newComments, requestedDelete: null });
    }

    function findAndRemove(comments: Comment[], idToDelete: number): boolean {
      const index = comments.findIndex(c => c.id === idToDelete);
      if (index !== -1) {
        comments.splice(index, 1);
        return true;
      }
      return comments.some(c => findAndRemove(c.replies || [], idToDelete));
    }
  }

  function submitReply(id: number) {
    const { comments } = get();
    const commentToSubmit = findComment(comments, id);
    if (commentToSubmit && !commentToSubmit.content.trim()) {
      deleteComment(id);
      return;
    }
    findAndMutate(id, c => {
      c.pendingReply = false;
    });
  }

  function addReply(parentId: number) {
    const { nextId } = get();
    findAndMutate(parentId, parentComment => {
      const newReply: Comment = {
        ...createComment(nextId),
        content: "",
        replyingTo: parentComment.user.username,
        pendingReply: true,
      };
      (parentComment.replies ??= []).push(newReply);
    });
    set({ nextId: nextId + 1 });
  }

  function vote(commentId: number, direction: VoteDirection) {
    const { comments, currentUser, userVotes } = get();
    const newComments = structuredClone(comments);
    const comment = findComment(newComments, commentId);

    if (!comment || comment.user.username === currentUser.username) {
      return;
    }

    const currentVote = userVotes[commentId];

    if (currentVote === direction) {
      return;
    }

    const scoreChange = direction - (currentVote || 0);
    comment.score += scoreChange;

    const newUserVotes = { ...userVotes, [commentId]: direction };

    set({ comments: newComments, userVotes: newUserVotes });
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
      const newComment: Comment = {
        ...createComment(nextId),
        content,
      };
      set({
        comments: [...comments, newComment],
        nextId: nextId + 1,
        newCommentContent: "",
      });
    },
    setRequestedDelete: (id: number | null) => set({ requestedDelete: id }),
    vote,
  };
}

export const store = createStore<State>()(
  persist(
    (set, get) => ({
      ...initialState,
      actions: createActions(set, get),
    }),
    {
      name: "comment-state",
      partialize: state => ({
        comments: state.comments,
        currentUser: state.currentUser,
        userVotes: state.userVotes,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          addTimestamps(state.comments);
          state.nextId = maxId(state.comments) + 1;
        }
      },
    }
  )
);

function parseCreatedAt(createdAt: string): { ts: number; expiration: number } {
  const now = Date.now();
  const match = createdAt.match(/(\d+)\s(\w+)/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    for (const { name, secs } of durationUnits) {
      if (unit.startsWith(name)) {
        const ts = now - value * secs * 1000;
        const expiration = now + secs * 1000;
        return { ts, expiration };
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
    if (c.replies) {
      addTimestamps(c.replies);
    }
  }
}
