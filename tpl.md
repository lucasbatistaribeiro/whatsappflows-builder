# Call permission request message template



Call permission request templates allow you to request permission to call WhatsApp users. They include a required **body** component and a **call permission request** component. When a WhatsApp user receives the message, they can grant or deny your business permission to call them.

You can categorize call permission request templates as either `MARKETING` or `UTILITY`. This page demonstrates creating and sending a call permission request template with the `MARKETING` category. See [Call permission request templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/utility-templates/utility-call-permission-request-templates/) for a utility example.

## Limitations

- Only templates categorized as `MARKETING` or `UTILITY` can include a call permission request component.
- You must include body text, and it must not be empty.
- You can&#039;t combine the call permission request component with other interactive components.

## Create a call permission request template

Use the [Message Templates API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api) to [create a call permission request template](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api#post-version-waba-id-message-templates).

### Request syntax

```html
curl -X POST \
  &#039;https://graph.facebook.com/&lt;API_VERSION&gt;/&lt;WHATSAPP_BUSINESS_ACCOUNT_ID&gt;/message_templates&#039; \
  -H &#039;Authorization: Bearer &lt;ACCESS_TOKEN&gt;&#039; \
  -H &#039;Content-Type: application/json&#039; \
  -d &#039;&#123;
    &quot;name&quot;: &quot;&lt;TEMPLATE_NAME&gt;&quot;,
    &quot;language&quot;: &quot;&lt;TEMPLATE_LANGUAGE&gt;&quot;,
    &quot;category&quot;: &quot;&lt;CATEGORY&gt;&quot;,
    &quot;parameter_format&quot;: &quot;named&quot;,
    &quot;components&quot;: [
      &#123;
        &quot;type&quot;: &quot;body&quot;,
        &quot;text&quot;: &quot;&lt;BODY_TEXT&gt;&quot;,
        &quot;example&quot;: &#123;
          &quot;body_text_named_params&quot;: [
            &#123;
              &quot;param_name&quot;: &quot;&lt;PARAM_NAME&gt;&quot;,
              &quot;example&quot;: &quot;&lt;EXAMPLE_PARAM_VALUE&gt;&quot;
            &#125;
          ]
        &#125;
      &#125;,
      &#123;
        &quot;type&quot;: &quot;call_permission_request&quot;
      &#125;
   ]
&#125;&#039;
```

### Request parameters

| Placeholder | Description | Example value |
| --- | --- | --- |
| `&lt;ACCESS_TOKEN&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;[System token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#system-user-access-tokens) or [business token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#business-integration-system-user-access-tokens). | `EAAA...` |
| `&lt;API_VERSION&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Optional.**&lt;br&gt;&lt;br&gt;Graph API version. | v25.0 |
| `&lt;BODY_TEXT&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;Body text string. Supports named parameters in `&#123;&#123;parameter_name&#125;&#125;` format.&lt;br&gt;&lt;br&gt;Maximum 1024 characters. | `Hi &#123;&#123;first_name&#125;&#125;, as a Lucky Shrub VIP, get a first look at our rare new succulents before anyone else. Can we give you a quick call?` |
| `&lt;CATEGORY&gt;`&lt;br&gt;&lt;br&gt;_Enum_ | **Required.**&lt;br&gt;&lt;br&gt;Template category. Must be `MARKETING` or `UTILITY`. | `MARKETING` |
| `&lt;EXAMPLE_PARAM_VALUE&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required if body text uses named parameters.**&lt;br&gt;&lt;br&gt;Example value for the named parameter. | `Pablo` |
| `&lt;PARAM_NAME&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required if body text uses named parameters.**&lt;br&gt;&lt;br&gt;Name of the parameter, matching the placeholder in the body text. | `first_name` |
| `&lt;TEMPLATE_LANGUAGE&gt;`&lt;br&gt;&lt;br&gt;_Enum_ | **Required.**&lt;br&gt;&lt;br&gt;Template [language and locale code](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages). | `en_US` |
| `&lt;TEMPLATE_NAME&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;Template name.&lt;br&gt;&lt;br&gt;Maximum 512 characters. | `vip_early_access_call` |
| `&lt;WHATSAPP_BUSINESS_ACCOUNT_ID&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;WhatsApp Business account ID. | `106540352242922` |

### Example request


```bash
curl -X POST \
  &#039;https://graph.facebook.com/v23.0/106540352242922/message_templates&#039; \
  -H &#039;Authorization: Bearer EAAJB...&#039; \
  -H &#039;Content-Type: application/json&#039; \
  -d &#039;&#123;
    &quot;name&quot;: &quot;vip_early_access_call&quot;,
    &quot;language&quot;: &quot;en_US&quot;,
    &quot;category&quot;: &quot;MARKETING&quot;,
    &quot;parameter_format&quot;: &quot;named&quot;,
    &quot;components&quot;: [
      &#123;
        &quot;type&quot;: &quot;body&quot;,
        &quot;text&quot;: &quot;Hi &#123;&#123;first_name&#125;&#125;, as a Lucky Shrub VIP, get a first look at our rare new succulents before anyone else. Can we give you a quick call?&quot;,
        &quot;example&quot;: &#123;
          &quot;body_text_named_params&quot;: [
            &#123;
              &quot;param_name&quot;: &quot;first_name&quot;,
              &quot;example&quot;: &quot;Pablo&quot;
            &#125;
          ]
        &#125;
      &#125;,
      &#123;
        &quot;type&quot;: &quot;call_permission_request&quot;
      &#125;
   ]
&#125;&#039;
```


### Example response

```json
&#123;
  &quot;id&quot;: &quot;546151681022936&quot;,
  &quot;status&quot;: &quot;PENDING&quot;,
  &quot;category&quot;: &quot;MARKETING&quot;
&#125;
```

## Send a call permission request template

Use the [Messages API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api) to [send an approved call permission request template](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api#post-version-phone-number-id-messages) in a template message.

### Request syntax

```html
curl -X POST \
  &#039;https://graph.facebook.com/&lt;API_VERSION&gt;/&lt;WHATSAPP_BUSINESS_PHONE_NUMBER_ID&gt;/messages&#039; \
  -H &#039;Authorization: Bearer &lt;ACCESS_TOKEN&gt;&#039; \
  -H &#039;Content-Type: application/json&#039; \
  -d &#039;&#123;
    &quot;messaging_product&quot;: &quot;whatsapp&quot;,
    &quot;recipient_type&quot;: &quot;individual&quot;,
    &quot;to&quot;: &quot;&lt;WHATSAPP_USER_PHONE_NUMBER&gt;&quot;,
    &quot;type&quot;: &quot;template&quot;,
    &quot;template&quot;: &#123;
      &quot;name&quot;: &quot;&lt;TEMPLATE_NAME&gt;&quot;,
      &quot;language&quot;: &#123;
        &quot;policy&quot;: &quot;deterministic&quot;,
        &quot;code&quot;: &quot;&lt;TEMPLATE_LANGUAGE_CODE&gt;&quot;
      &#125;,
      &quot;components&quot;: [
        &#123;
          &quot;type&quot;: &quot;body&quot;,
          &quot;parameters&quot;: [
            &#123;
              &quot;type&quot;: &quot;text&quot;,
              &quot;parameter_name&quot;: &quot;&lt;PARAM_NAME&gt;&quot;,
              &quot;text&quot;: &quot;&lt;PARAM_VALUE&gt;&quot;
            &#125;
          ]
        &#125;
      ]
    &#125;
&#125;&#039;
```

### Request parameters

| Placeholder | Description | Example value |
| --- | --- | --- |
| `&lt;ACCESS_TOKEN&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;[System token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#system-user-access-tokens) or [business token](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens#business-integration-system-user-access-tokens). | `EAAA...` |
| `&lt;API_VERSION&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Optional.**&lt;br&gt;&lt;br&gt;Graph API version. | v25.0 |
| `&lt;PARAM_NAME&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required if the template body uses named parameters.**&lt;br&gt;&lt;br&gt;Name of the parameter to replace in the template body. | `first_name` |
| `&lt;PARAM_VALUE&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required if the template body uses named parameters.**&lt;br&gt;&lt;br&gt;Value to substitute for the named parameter. | `Pablo` |
| `&lt;TEMPLATE_LANGUAGE_CODE&gt;`&lt;br&gt;&lt;br&gt;_Enum_ | **Required.**&lt;br&gt;&lt;br&gt;Template [language and locale code](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages). | `en_US` |
| `&lt;TEMPLATE_NAME&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;Name of the template to send. | `vip_early_access_call` |
| `&lt;WHATSAPP_BUSINESS_PHONE_NUMBER_ID&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;WhatsApp business phone number ID. | `106540352242922` |
| `&lt;WHATSAPP_USER_PHONE_NUMBER&gt;`&lt;br&gt;&lt;br&gt;_String_ | **Required.**&lt;br&gt;&lt;br&gt;WhatsApp user phone number. | `+16505551234` |

### Example request

```bash
curl -X POST \
  &#039;https://graph.facebook.com/v23.0/106540352242922/messages&#039; \
  -H &#039;Authorization: Bearer EAAJB...&#039; \
  -H &#039;Content-Type: application/json&#039; \
  -d &#039;&#123;
    &quot;messaging_product&quot;: &quot;whatsapp&quot;,
    &quot;recipient_type&quot;: &quot;individual&quot;,
    &quot;to&quot;: &quot;+15551234567&quot;,
    &quot;type&quot;: &quot;template&quot;,
    &quot;template&quot;: &#123;
      &quot;name&quot;: &quot;vip_early_access_call&quot;,
      &quot;language&quot;: &#123;
        &quot;policy&quot;: &quot;deterministic&quot;,
        &quot;code&quot;: &quot;en_US&quot;
      &#125;,
      &quot;components&quot;: [
        &#123;
          &quot;type&quot;: &quot;body&quot;,
          &quot;parameters&quot;: [
            &#123;
              &quot;type&quot;: &quot;text&quot;,
              &quot;parameter_name&quot;: &quot;first_name&quot;,
              &quot;text&quot;: &quot;Pablo&quot;
            &#125;
          ]
        &#125;
      ]
    &#125;
&#125;&#039;
```

### Example response

```json
&#123;
  &quot;messaging_product&quot;: &quot;whatsapp&quot;,
  &quot;contacts&quot;: [
    &#123;
      &quot;input&quot;: &quot;+15551234567&quot;,
      &quot;wa_id&quot;: &quot;15551234567&quot;
    &#125;
  ],
  &quot;messages&quot;: [
    &#123;
      &quot;id&quot;: &quot;wamid.HBgLMTMyMzI4NjU2NzgVAgARGBJBQzRBRDBEMDEwQzVBM0M0QkIA&quot;,
      &quot;message_status&quot;: &quot;accepted&quot;
    &#125;
  ]
&#125;
```
