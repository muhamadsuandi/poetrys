// Google Apps Script API for Poetry's Catering

const SCRIPT_PROP = PropertiesService.getScriptProperties();

function setup() {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  SCRIPT_PROP.setProperty("key", doc.getId());
}

function doPost(e) {
  return handleResponse(e);
}

function doGet(e) {
  return handleResponse(e);
}

function handleResponse(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;

    if (action === "GET_ALL") {
      const sheetName = e.parameter.sheet;
      const sheet = doc.getSheetByName(sheetName);
      if (!sheet) throw new Error("Sheet not found");

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = [];
      
      for (let i = 1; i < data.length; i++) {
        const rowData = {};
        for (let j = 0; j < headers.length; j++) {
          rowData[headers[j]] = data[i][j];
        }
        rows.push(rowData);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "ADD_ROW") {
      const sheetName = e.parameter.sheet;
      const sheet = doc.getSheetByName(sheetName);
      if (!sheet) throw new Error("Sheet not found");

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const nextRow = sheet.getLastRow() + 1;
      const newRow = [];

      // Parse JSON payload
      const payload = JSON.parse(e.postData.contents);
      
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        newRow.push(payload[header] !== undefined ? payload[header] : "");
      }

      sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Row added" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "DELETE_ROW") {
      const sheetName = e.parameter.sheet;
      const sheet = doc.getSheetByName(sheetName);
      if (!sheet) throw new Error("Sheet not found");

      const id = e.parameter.id;
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) { // assuming ID is in the first column
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Row deleted" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      throw new Error("Row not found");
    }

    if (action === "UPDATE_ROW") {
      const sheetName = e.parameter.sheet;
      const sheet = doc.getSheetByName(sheetName);
      if (!sheet) throw new Error("Sheet not found");

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const payload = JSON.parse(e.postData.contents);
      const id = payload.id;
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) { 
          const newRow = [];
          for (let j = 0; j < headers.length; j++) {
            newRow.push(payload[headers[j]] !== undefined ? payload[headers[j]] : data[i][j]);
          }
          sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
          return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Row updated" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      throw new Error("Row not found");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
