import { render, html } from "lit-html";

const bodyHtml = () => html``;

const renderBody = () => render(bodyHtml(), document.body);

window.onclick = window.onhashchange = window.oninput = renderBody;
renderBody();
