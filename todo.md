# Certificate Bulk Sender - TODO

## Database Schema
- [ ] Create certificates table (template, text positions, fonts)
- [ ] Create participants table (name, email, event)
- [ ] Create email_logs table (tracking sent/failed emails)
- [ ] Create smtp_settings table (SMTP configuration)

## Frontend Components
- [ ] Dashboard layout with sidebar navigation
- [ ] Certificate template upload component
- [ ] Text positioning UI (visual positioning on template preview)
- [ ] Font, size, color selection for text overlays
- [ ] CSV upload component for participants
- [ ] Participant data preview table
- [ ] Manual participant entry/editing form
- [ ] Email template configuration panel
- [ ] SMTP settings configuration panel
- [ ] Send progress dashboard with real-time status
- [ ] Failed email re-send interface

## Backend API (tRPC Procedures)
- [ ] Upload certificate template
- [ ] Save text positioning and styling
- [ ] Upload and parse CSV file
- [ ] Validate participant emails
- [ ] Add/edit/delete individual participants
- [ ] Generate personalized PDF certificates
- [ ] Configure SMTP settings
- [ ] Send bulk emails with progress tracking
- [ ] Fetch send status and logs
- [ ] Re-send failed emails

## Certificate Generation
- [ ] Implement canvas-based certificate rendering
- [ ] Overlay participant name on template
- [ ] Overlay event name on template
- [ ] Convert rendered canvas to PDF
- [ ] Handle font rendering with custom fonts

## Email Sending
- [ ] Integrate Nodemailer
- [ ] Configure SMTP settings
- [ ] Send emails with PDF attachments
- [ ] Track email send status (sent/failed/pending)
- [ ] Implement retry logic for failed sends

## UI/UX
- [ ] Apply color scheme (cream #FDFBF7, dark blue #0A2540, teal #20B2AA)
- [ ] Responsive design for all pages
- [ ] Loading states and progress indicators
- [ ] Error handling and validation messages
- [ ] Success notifications

## Testing & Deployment
- [ ] Test certificate generation with sample data
- [ ] Test email sending with test SMTP
- [ ] Create .env.example file
- [ ] Write comprehensive README with setup instructions
- [ ] Add Vercel deployment configuration
- [ ] Package all files into zip file
