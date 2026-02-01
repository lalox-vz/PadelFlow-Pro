# WhatsApp Integration Guide for Olimpo

To enable real-time WhatsApp notifications for the Admin (e.g., "New Booking from John Doe"), you need a **WhatsApp API Gateway**. Since WhatsApp does not allow bots to message users without approval, and you are messaging *yourself* (the Admin), the best cost-effective solution is a Personal Gateway or the Official API.

## Recommended Services

### 1. CallMeBot (Free - Best for Admin Notifications)
This is a free API specifically designed to send WhatsApp messages to **yourself**.
- **Cost**: Free.
- **Setup**: Very easy.
- **Pros**: Perfect for "Notify me when a user books".
- **Cons**: Can only message your registered number, not customers.

### 2. Twilio (Paid - Professional)
- **Cost**: ~$0.005 per message.
- **Setup**: Requires account verification.
- **Pros**: Can message anyone (customers) if they opt-in. Scalable.
- **Cons**: Monthly costs, strict template rules.

### 3. Wati / UltraMsg (Third Party)
- **Cost**: Monthly subscription ($30-50/mo).
- **Setup**: Scans your WhatsApp QR code to act as "you".
- **Pros**: Messages come from your actual phone number.
- **Cons**: Higher monthly fixed cost.

---

## Implementation Plan (After choosing a provider)

### Step 1: Create an API Route (Server Side)
Since we cannot expose API Keys in the browser, users will trigger a Server Action or API Route when they book.

**Example Code (using CallMeBot):**

```typescript
// app/api/notify/route.ts
export async function POST(request: Request) {
  const { message } = await request.json();
  
  // CallMeBot API URL
  const apiKey = process.env.CALLMEBOT_API_KEY; // '123456'
  const phone = process.env.ADMIN_PHONE; // '+58414...'
  
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
  
  await fetch(url);
  
  return Response.json({ success: true });
}
```

### Step 2: Trigger it from the Frontend
In `app/(dashboard)/client/book/page.tsx`, inside `handleTrainingClick`:

```typescript
// ... after successful supabase insert
await fetch('/api/notify', {
  method: 'POST',
  body: JSON.stringify({ 
    message: `New Booking!\nUser: ${user.email}\nClass: ${training.title}` 
  })
});
```

## Current Implementation
We have implemented the **"Announce to Group"** feature using a "Click-to-Chat" link. This is free and requires no API.
For **Admin Notifications**, once you select a provider (like CallMeBot), a developer can simply copy-paste the snippet above into a new API file.
