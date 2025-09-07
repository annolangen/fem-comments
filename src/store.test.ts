import { describe, it, expect, beforeEach } from "vitest";
import { store } from "./store"; // Assuming store is exported

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