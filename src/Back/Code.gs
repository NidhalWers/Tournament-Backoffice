function main(){
  generateGroupMatches(1);
}

/*
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}
*/

function doGet() {
  const template = HtmlService.createTemplateFromFile("Index");
  return template.evaluate();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🛠️ Custom handling")
    .addItem("Initialize sheets","initializeSpreadsheet")
    .addToUi();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}