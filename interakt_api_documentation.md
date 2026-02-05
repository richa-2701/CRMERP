# Interakt Comprehensive API Documentation

**Base URL**: `https://api.interakt.ai/v1/public/`

**Authentication**:
All API requests must include the **Authorization** header with your Base64 encoded API Key.
`Authorization: Basic <YOUR_BASE64_API_KEY>`
`Content-Type: application/json`

---

## 1. Track User
**Method**: `POST`
**Path**: `/track/users/`

### Description
Creates or updates a user (lead) in Interakt. This is the primary way to sync CRM contacts to Interakt.

### Request Body
```json
{
  "phoneNumber": "9999999999",
  "countryCode": "+91",
  "traits": {
    "name": "John Doe",
    "email": "john@example.com",
    "merchant_location": "IN",
    "whatsapp_opted_in": true,
    "account_owner_email_crm": "agent@company.com",
    "lead_status_crm": "New"
  },
  "tags": [
    "lead",
    "campaign-target"
  ],
  "add_to_sales_cycle": true
}
```

### Response (202 Accepted)
```json
{
  "result": true,
  "message": "Customer with e9c4d7e4-70f2-488a-b916-b9014a021a2f updated successfully"
}
```

---

## 2. Send Text Message
**Method**: `POST`
**Path**: `/message/`

### Description
Sends a free-form text message. Only permitted if the user has messaged you within the last 24 hours (Service Conversation).

### Request Body
```json
{
  "fullPhoneNumber": "919999999999",
  "callbackData": "custom_tracking_id",
  "type": "Text",
  "data": {
    "message": "Hello! How can we assist you today?"
  }
}
```

### Response (201 Created)
```json
{
  "result": true,
  "message": "Message queued for sending via Interakt. Check webhook for delivery status",
  "id": "d58aeff7-a81c-47a7-9b67-f381e13f6c4e"
}
```

---

## 3. Send Template Message
**Method**: `POST`
**Path**: `/message/`

### Description
Sends an approved WhatsApp Template message. Can be sent outside the 24-hour window. Supports variables (`bodyValues`) and Headers (Text/Image/Doc).

### Request Body (Basic)
```json
{
  "countryCode": "+91",
  "phoneNumber": "9999999999",
  "type": "Template",
  "template": {
    "name": "welcome_message",
    "languageCode": "en",
    "bodyValues": [
      "John" 
    ]
  }
}
```
*Note: `bodyValues` replace variables `{{1}}`, `{{2}}` in the template body.*

### Request Body (With Header & Buttons)
```json
{
  "fullPhoneNumber": "919999999999",
  "type": "Template",
  "template": {
    "name": "invoice_update",
    "languageCode": "en",
    "headerValues": [
       "https://example.com/invoice.pdf"
    ],
    "bodyValues": [
      "Order #1234"
    ],
    "buttonValues": {
       "1": ["12345"] 
    }
  }
}
```

### Response (201 Created)
```json
{
  "result": true,
  "message": "Message created successfully",
  "id": "8d620ba1-640f-42ee-a8dd-15363422144b"
}
```

---

## 4. Get Users
**Method**: `POST`
**Path**: `/apis/users/`
**Query Params**: `?offset=0&limit=100`

### Description
Retrieves a paginated list of contacts from Interakt, optionally filtered by creation date.

### Request Body (Filters)
```json
{
  "filters": [
    {
      "trait": "created_at_utc",
      "op": "gt",
      "val": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Response (200 OK)
```json
{
  "result": true,
  "message": "Customers",
  "data": {
    "total_customers": 150,
    "customers": [
      {
        "id": "abc-123",
        "phone_number": "9999999999",
        "country_code": "+91",
        "traits": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "created_at_utc": "2024-02-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 5. Get All Templates (Internal Helper)
**Method**: `GET`
**Path**: `/track/organization/templates/`
*Note: This endpoint retrieves all approved templates associated with your Interakt Organization.*

### Response (200 OK)
```json
{
    "result": true,
    "results": {
        "templates": [
            {
                "name": "welcome_msg",
                "language": "en",
                "body": "Hi {{1}}, welcome!",
                "approval_status": "Approved"
            }
        ]
    }
}
```
