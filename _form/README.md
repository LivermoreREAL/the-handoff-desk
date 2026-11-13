# Request form email for The Handoff Desk

Until this is set up, the site's request form opens the visitor's email app with a message to sam@samyusufi.com already filled in. That works, but some visitors won't press send. After setup, requests arrive in your inbox directly and are logged in a Google Sheet. Nothing opens on the visitor's side.

What happens when someone sends the form, once set up:
1. A row is added to the Google Sheet "The Handoff Desk Requests", with a Status dropdown (New, Replied, Quoted, Booked, Not a fit).
2. You get an email at sam@samyusufi.com. Replying goes straight to the agent.
3. The visitor sees a thank-you message on the page.
If the connection fails, the page keeps what they typed and shows your phone and email.

Protection: a hidden field bots fill, a minimum fill time, duplicate-send protection, input checks, formula-neutralizing in the Sheet, and a cap of 40 requests per hour.

## One-time setup (about 5 minutes, signed in as sam@samyusufi.com)
1. Go to https://script.google.com, click New project, and name it "The Handoff Desk requests".
2. Replace the editor's contents with `Code.gs` from this folder. Save.
3. Choose the function `setup` and click Run. Approve Google's permission screen (Sheets and sending email as you). The log shows the new Sheet's link.
4. Choose `sendTest` and click Run. Check that a row appeared in the Sheet and an email arrived.
5. Click Deploy > New deployment > gear icon > Web app. Execute as: Me. Who has access: Anyone. Click Deploy and copy the Web app URL (it ends in /exec).
6. Send that URL to Claude, or paste it between the quotes in `var ENDPOINT = "";` near the bottom of `index.html`, then redeploy.
7. Send one real test from the live site and confirm the row, the email, and the thank-you message.

## Changing the script later
Edit `Code.gs` in the Apps Script editor, then Deploy > Manage deployments > pencil > Version: New version > Deploy. The URL stays the same.
