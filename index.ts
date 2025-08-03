import { render, html } from "lit-html";
import data from "./data.json";

const messageHtml = comment =>
  html`<div class="grid grid-cols-12 p-2 gap-2 bg-white rounded-md items-center">
    <img class="col-span-2 h-4/5" src=${comment.user.image.png} alt="" />
    <div class="col-span-3 font-bold">${comment.user.username}</div>
${
  data.currentUser.username === comment.user.username
    ? html` <div
        class="col-span-2 rounded-sm bg-purple-600 pt-0.5 pb-1 pl-[11px] text-sm leading-none font-bold text-white"
      >
        you
      </div>`
    : null
}
    <div class="col-start-8 text-grey-500 col-span-5 content-center">${comment.createdAt}</div>
    <div class="row-start-2 col-span-12 text-grey-500 mb-2">
      ${
        comment.replyingTo
          ? html`<span class="font-bold text-purple-600">
              @${comment.replyingTo} </span>`
          : null
      }
    ${comment.content}
  </div>
    <div class="row-start-3 col-span-5"> 
      <span class="px-4 py-2 bg-grey-100 text-purple-600 font-medium rounded-md">
        <img class="inline" src="./images/icon-plus.svg"> 
        <span class="px-2">${comment.score}</span>
        <img class="inline" src="./images/icon-minus.svg"> 
     </span>
  </div>
    <div class="col-start-6 col-span-7 text-right mb-2">
      ${
        data.currentUser.username === comment.user.username
          ? html` <button class="px-2 font-medium text-red-600">
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
    ${data.comments.map(commentHtml)}
  </div>`;

const renderBody = () => render(bodyHtml(), document.body);

window.onclick = window.onhashchange = window.oninput = renderBody;
renderBody();
