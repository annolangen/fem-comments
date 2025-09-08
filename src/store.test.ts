import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store"; // Assuming store is exported
import type { Comment } from "./types";

describe("addComment action", () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    store.setState(store.getState().getInitialState());
  });

  it("should add a new comment and clear the input", () => {
    const initialCommentsCount = store.getState().comments.length;

    // 1. Simulate user typing
    store.getState().actions.setNewCommentContent("This is a test comment.");

    // 2. Dispatch the action
    store.getState().actions.addComment();

    const state = store.getState();

    // 3. Assert the results
    expect(state.comments.length).toBe(initialCommentsCount + 1);
    expect(state.comments.at(-1)?.content).toBe("This is a test comment.");
    expect(state.newCommentContent).toBe("");
  });
});

describe("deleteComment action", () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    store.setState(store.getState().getInitialState());
  });

  it("should remove a comment and its replies", () => {
    const initialCommentsCount = store.getState().comments.length;

    // 1. Dispatch the action
    store.getState().actions.deleteComment(1);

    const state = store.getState();

    // 2. Assert the results
    expect(state.comments.length).toBe(initialCommentsCount - 1);
    expect(state.comments.find(c => c.id === 1)).toBe(undefined);
  });
});

describe("findAndMutate action", () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    store.setState(store.getState().getInitialState());
  });

  it("should upvote a comment", () => {
    const initialScore = store.getState().comments[0].score;

    // 1. Dispatch the action
    store.getState().actions.findAndMutate(1, c => c.score++);

    const state = store.getState();

    // 2. Assert the results
    expect(state.comments[0].score).toBe(initialScore + 1);
  });
});

describe("submitReply action", () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    store.setState(store.getState().getInitialState());
  });

  it("should cancel the reply if the content is empty", () => {
    const initialCommentsCount = store.getState().comments.length;

    // 1. Add a reply
    store.getState().actions.addReply(1);

    // 2. Dispatch the action
    store.getState().actions.submitReply(store.getState().nextId - 1);

    const state = store.getState();

    // 3. Assert the results
    expect(state.comments.length).toBe(initialCommentsCount);
  });
});

describe("vote action", () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    store.setState(store.getState().getInitialState());
  });

  function getComment(id: number): Comment {
    const find = (comments: Comment[]): Comment | undefined =>
      comments.find(comment => comment.id === id) ||
      find(comments.flatMap(c => c.replies || []));
    return find(store.getState().comments)!;
  }

  const { vote } = store.getState().actions;

  it("should not allow a user to vote for their own comment", () => {
    const ownCommentId = 4; // juliusomo's comment
    const initialScore = getComment(ownCommentId).score;

    vote(ownCommentId, 1);
    expect(getComment(ownCommentId).score).toBe(initialScore);

    vote(ownCommentId, -1);
    expect(getComment(ownCommentId).score).toBe(initialScore);
  });

  it("should increase score by 1 on upvote", () => {
    const commentId = 1; // amyrobson's comment
    const initialScore = getComment(commentId).score;

    vote(commentId, 1);

    expect(getComment(commentId).score).toBe(initialScore + 1);
    expect(store.getState().userVotes[commentId]).toBe(1);
  });

  it("should decrease score by 1 on downvote", () => {
    const commentId = 1;
    const initialScore = getComment(commentId).score;

    vote(commentId, -1);

    const state = store.getState();
    expect(getComment(commentId).score).toBe(initialScore - 1);
    expect(state.userVotes[commentId]).toBe(-1);
  });

  it("should cancel an upvote when upvoting again", () => {
    const commentId = 1;
    const initialScore = getComment(commentId).score;

    vote(commentId, 1); // Upvote
    vote(commentId, 1); // Cancel

    expect(getComment(commentId).score).toBe(initialScore);
    expect(store.getState().userVotes[commentId]).toBeUndefined();
  });

  it("should decrease score by 2 when changing from upvote to downvote", () => {
    const commentId = 1;
    const initialScore = getComment(commentId).score;

    vote(commentId, 1); // Upvote
    vote(commentId, -1); // Change to downvote

    expect(getComment(commentId).score).toBe(initialScore - 1);
    expect(store.getState().userVotes[commentId]).toBe(-1);
  });

  it("should increase score by 2 when changing from downvote to upvote", () => {
    const commentId = 1;
    const initialScore = getComment(commentId).score;

    vote(commentId, -1); // Downvote
    vote(commentId, 1); // Change to upvote

    expect(getComment(commentId).score).toBe(initialScore + 1);
    expect(store.getState().userVotes[commentId]).toBe(1);
  });
});
