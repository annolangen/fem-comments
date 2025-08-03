import { render, html } from "lit-html";
import data from "./data.json";

const messageHtml = comment =>
  html`<div class="grid grid-cols-12 p-2 gap-2 bg-white rounded-md items-center">
    <img class="col-span-2 h-4/5" src=${comment.user.image.png} alt="" />
    <div class="col-span-3 font-bold">${comment.user.username}</div>
    <div class="col-start-8 text-grey-500 col-span-5">${comment.createdAt}</div>
    <div class="row-start-2 col-span-12 text-grey-500 mb-2">${comment.content}</div>
    <div class="row-start-3 col-span-6"> 
      <span class="px-4 py-2 bg-grey-100 text-purple-600 font-medium rounded-md">
        <img class="inline" src="./images/icon-plus.svg"> 
        <span class="px-2">${comment.score}</span>
        <img class="inline" src="./images/icon-minus.svg"> 
     </span>
  </div>
    <div class="col-start-7 col-span-6 text-right mb-2">
      <button class="rounded-md px-2 font-medium text-purple-600">
        <span><img class="inline" src="./images/icon-reply.svg"> Reply<span></button>
      </button>
    </div>
  </div> `;

const commentHtml = comment => html`
  ${messageHtml(comment)}
  <div class="pl-4 flex flex-col">
    ${(comment.replies || []).map(commentHtml)}
  </div>
`;

const bodyHtml = () =>
  html` <div class="flex flex-col min-h-screen p-4 gap-2 bg-grey-50">
    ${data.comments.map(commentHtml)}
  </div>`;

const renderBody = () => render(bodyHtml(), document.body);

window.onclick = window.onhashchange = window.oninput = renderBody;
renderBody();
