// Google Apps Script API for Poetry's Catering

const SCRIPT_PROP = PropertiesService.getScriptProperties();

function setup() {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  SCRIPT_PROP.setProperty("key", doc.getId());
}

// FUNGSI INI HANYA UNTUK MEMANCING IZIN GOOGLE CALENDAR
function authorizeCalendar() {
  const cal = CalendarApp.getDefaultCalendar();
  Logger.log("Calendar Name: " + cal.getName());
}

function doPost(e) {
  return handleResponse(e);
}

function doGet(e) {
  return handleResponse(e);
}

function syncToCalendar(sheetName, payload, oldEventId) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    let title = "";
    let dateStr = "";
    let desc = "";

    if (sheetName === "Invoices") {
      if (!payload.cateringDate) return oldEventId;
      title = "Catering: " + (payload.customerName || "Unknown") + " - " + payload.invoiceNumber;
      dateStr = payload.cateringDate;
      let itemsStr = "";
      try {
        const items = typeof payload.items === 'string' ? JSON.parse(payload.items) : (payload.items || []);
        itemsStr = items.map(i => i.qty + "x " + i.name).join(", ");
      } catch(e){}
      desc = "Phone: " + (payload.customerPhone || "") + "\\nLoc: " + (payload.cateringLocation || "") + "\\nItems: " + itemsStr;
    } else if (sheetName === "Schedules") {
      if (!payload.date) return oldEventId;
      title = (payload.type || "Schedule") + ": " + (payload.title || "Untitled");
      dateStr = payload.date;
      desc = "Loc: " + (payload.location || "") + "\\nNotes: " + (payload.notes || "");
    } else {
      return oldEventId;
    }

    // Split date correctly (prevent timezone shifting by parsing manual y-m-d)
    const parts = dateStr.split('-');
    if (parts.length !== 3) return oldEventId;
    const eventDate = new Date(parts[0], parseInt(parts[1])-1, parts[2]);
    let event;

    if (oldEventId) {
      try {
        event = calendar.getEventById(oldEventId);
        if (event) {
          event.setTitle(title);
          event.setAllDayDate(eventDate);
          event.setDescription(desc);
          return oldEventId;
        }
      } catch(e) {}
    }

    event = calendar.createAllDayEvent(title, eventDate, {description: desc});
    return event.getId();

  } catch(e) {
    return oldEventId;
  }
}

function deleteCalendarEvent(eventId) {
  if (!eventId) return;
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const event = calendar.getEventById(eventId);
    if (event) event.deleteEvent();
  } catch(e) {}
}

function handleResponse(e) {
  const action = e.parameter.action;
  const isWriteAction = ["ADD_ROW", "UPDATE_ROW", "DELETE_ROW"].includes(action);
  
  const lock = LockService.getScriptLock();
  if (isWriteAction) {
    lock.tryLock(10000);
  }

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "GET_INIT_DATA") {
      const sheetsToFetch = ["Menus", "Invoices", "Users", "Schedules"];
      const resultData = {};

      sheetsToFetch.forEach(sheetName => {
        const sheet = doc.getSheetByName(sheetName);
        if (sheet) {
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
          resultData[sheetName] = rows;
        } else {
          resultData[sheetName] = [];
        }
      });

      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: resultData }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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
      
      // Sync to Calendar
      if (sheetName === "Invoices" || sheetName === "Schedules") {
        const eventId = syncToCalendar(sheetName, payload, null);
        if (eventId) {
          payload.eventid = eventId; // Will be stored if the column exists
        }
      }
      
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
      const headers = data[0];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) { // assuming ID is in the first column
          // Sync to Calendar
          if (sheetName === "Invoices" || sheetName === "Schedules") {
            const eventIdIndex = headers.indexOf("eventid");
            if (eventIdIndex > -1 && data[i][eventIdIndex]) {
              deleteCalendarEvent(data[i][eventIdIndex]);
            }
          }
          
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
          // Sync to Calendar
          if (sheetName === "Invoices" || sheetName === "Schedules") {
            const eventIdIndex = headers.indexOf("eventid");
            let oldEventId = eventIdIndex > -1 ? data[i][eventIdIndex] : null;
            if (payload.eventid) oldEventId = payload.eventid;
            
            const newEventId = syncToCalendar(sheetName, payload, oldEventId);
            if (newEventId) payload.eventid = newEventId;
          }

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
    if (isWriteAction) {
      lock.releaseLock();
    }
  }
}
