# 🎯 Meta Pixel Production Setup - BiKitchen

## ✅ Implementation Complete

**Domain**: bikitchencr.com  
**Pixel ID**: 825371743662986  
**Status**: Production-ready for Meta Ads optimization

---

## 📊 Events Implemented

### 1. **PageView** (Automatic)
- **Trigger**: Automatically fires on every page load
- **Location**: `index.html` (lines 61-78)
- **Status**: ✅ Active
- **Purpose**: Track all page visits for audience building

### 2. **ViewContent** (Standard Event)
Fires when users view key content pages:

#### a) **Packs Page** (`/packs`)
- **Trigger**: Page load
- **File**: `src/pages/PacksPage.jsx` (line 948-955)
- **Parameters**:
  ```javascript
  {
    id: 'packs-page',
    name: 'Packs Semanales',
    category: 'Meal Plans',
    price: 0
  }
  ```
- **Purpose**: Track interest in meal plans

#### b) **Menu Page** (`/menu`)
- **Trigger**: Page load
- **File**: `src/pages/CatalogPage.jsx` (line 28-36)
- **Parameters**:
  ```javascript
  {
    id: 'menu-page',
    name: 'Menú Semanal',
    category: 'Menu',
    price: 0
  }
  ```
- **Purpose**: Track menu browsing behavior

#### c) **Promotions Page** (`/promociones`)
- **Trigger**: Page load
- **File**: `src/pages/PromocionesPage.jsx` (line 584-592)
- **Parameters**:
  ```javascript
  {
    id: 'promociones-page',
    name: 'Promociones',
    category: 'Promotions',
    price: 0
  }
  ```
- **Purpose**: Track promotion interest

### 3. **AddToCart** (Standard Event)
- **Trigger**: When user adds item to cart
- **File**: `src/context/CartContext.jsx` (line 132)
- **Parameters**:
  ```javascript
  {
    content_name: item.name,
    content_ids: [item.id],
    content_type: 'product',
    value: item.price * quantity,
    currency: 'CRC',
    quantity: item.quantity
  }
  ```
- **Purpose**: Track cart additions for retargeting
- **Status**: ✅ Active

### 4. **Lead** (Standard Event)
Fires when users initiate contact:

#### a) **WhatsApp Button** (Floating button)
- **Trigger**: Click on floating WhatsApp button
- **File**: `src/components/WhatsAppButton.jsx` (line 27-32)
- **Parameters**:
  ```javascript
  {
    content_name: 'WhatsApp Button Click',
    content_category: 'Contact'
  }
  ```
- **Purpose**: Track contact intent
- **Status**: ✅ Active

#### b) **WhatsApp CTAs** (Throughout site)
- **Trigger**: Click on any WhatsApp CTA button
- **Locations**:
  - Landing page hero CTAs
  - Pack detail pages
  - Promotion pages
  - Footer contact links
- **Purpose**: Track all WhatsApp contact attempts

---

## 🛡️ Duplicate Prevention

The pixel service includes built-in duplicate prevention:

- **Mechanism**: Events are tracked with a 2-second cooldown
- **File**: `src/services/facebookPixel.js` (lines 30-49)
- **How it works**:
  1. Each event is logged with a timestamp
  2. If same event fires within 2 seconds, it's skipped
  3. Old events (>5 seconds) are automatically cleaned
- **Result**: No duplicate events on scroll, reload, or rapid clicks

---

## 📁 Files Modified/Created

### Modified Files:
1. ✅ `index.html` - Pixel script added
2. ✅ `src/services/facebookPixel.js` - Enhanced with deduplication
3. ✅ `src/context/CartContext.jsx` - AddToCart tracking
4. ✅ `src/components/WhatsAppButton.jsx` - Lead tracking
5. ✅ `src/pages/PacksPage.jsx` - ViewContent tracking
6. ✅ `src/pages/CatalogPage.jsx` - ViewContent tracking
7. ✅ `src/pages/PromocionesPage.jsx` - ViewContent tracking

### Created Files:
1. ✅ `docs/META_PIXEL_PRODUCTION_SETUP.md` - This document
2. ✅ `docs/FACEBOOK_PIXEL.md` - Full implementation guide

---

## 🧪 Verification Steps

### 1. **Facebook Pixel Helper** (Chrome Extension)
1. Install [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Visit bikitchencr.com
3. Click extension icon
4. Verify pixel **825371743662986** is active
5. Navigate site and verify events fire

### 2. **Meta Events Manager**
1. Go to [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Select pixel 825371743662986
3. Click "Test Events"
4. Enter bikitchencr.com
5. Navigate site and watch events appear in real-time

### 3. **Browser Console**
Open DevTools (F12) and check console for:
```
[FB Pixel] ✓ Event tracked: PageView
[FB Pixel] ✓ Event tracked: ViewContent {id: "packs-page", ...}
[FB Pixel] ✓ Event tracked: AddToCart {content_name: "Pack Semanal", ...}
[FB Pixel] ✓ Event tracked: Lead {content_name: "WhatsApp Button Click", ...}
```

---

## 🎯 User Flow & Event Triggers

### Typical User Journey:

1. **Lands on homepage** → `PageView` fires
2. **Clicks "Ver Packs"** → Navigates to /packs → `ViewContent` fires
3. **Browses meal plans** → No additional events (prevents spam)
4. **Clicks "Agregar al carrito"** → `AddToCart` fires
5. **Clicks WhatsApp button** → `Lead` fires
6. **Opens WhatsApp** → User leaves site (tracked as Lead)

### Alternative Journey:

1. **Lands on /menu** → `PageView` + `ViewContent` fire
2. **Views menu items** → No additional events
3. **Clicks "Ver Packs"** → `ViewContent` fires (new page)
4. **Adds to cart** → `AddToCart` fires
5. **Contacts via WhatsApp** → `Lead` fires

---

## 🚀 Meta Ads Optimization

### Recommended Campaign Setup:

#### 1. **Awareness Campaigns**
- **Objective**: Awareness
- **Optimization**: Reach or Impressions
- **Pixel Events**: PageView
- **Audience**: Broad targeting in Costa Rica

#### 2. **Consideration Campaigns**
- **Objective**: Traffic or Engagement
- **Optimization**: Landing Page Views
- **Pixel Events**: ViewContent
- **Audience**: Lookalike from PageView (1-2%)

#### 3. **Conversion Campaigns** (Most Important)
- **Objective**: Conversions
- **Optimization**: Lead
- **Pixel Events**: Lead (WhatsApp clicks)
- **Audience**: Lookalike from ViewContent or AddToCart (1-3%)

#### 4. **Retargeting Campaigns**
- **Objective**: Conversions
- **Optimization**: Lead
- **Custom Audiences**:
  - Viewed content but didn't contact (ViewContent, no Lead)
  - Added to cart but didn't contact (AddToCart, no Lead)
  - Visited in last 30 days

---

## 📈 Custom Audiences to Create

### In Meta Ads Manager:

1. **Website Visitors (30 days)**
   - Event: PageView
   - Time: Last 30 days

2. **Content Viewers**
   - Event: ViewContent
   - Time: Last 14 days

3. **Cart Abandoners**
   - Event: AddToCart
   - Exclude: Lead
   - Time: Last 7 days

4. **High Intent Users**
   - Event: ViewContent (2+ times)
   - Time: Last 14 days

5. **Leads (Contacted)**
   - Event: Lead
   - Time: Last 90 days

---

## 🔍 Troubleshooting

### Issue: Events not showing in Meta
**Solution**: 
- Verify pixel is on production domain (bikitchencr.com)
- Check browser console for pixel errors
- Use Facebook Pixel Helper to verify pixel loads

### Issue: Duplicate events
**Solution**: 
- Already handled by deduplication system
- Check console for "skipped (duplicate prevention)" messages

### Issue: Events fire on wrong pages
**Solution**: 
- ViewContent only fires on specific pages (packs, menu, promociones)
- Lead only fires on WhatsApp button clicks
- Check file locations in this document

---

## 📝 Assumptions Made

1. **User Flow**: Users primarily contact via WhatsApp (not email/phone)
2. **Conversion**: WhatsApp click = Lead (main conversion action)
3. **Content**: Packs, Menu, and Promotions are key content pages
4. **Cart**: AddToCart is important for retargeting, even if checkout is via WhatsApp
5. **Language**: All event names in English for Meta compatibility

---

## ⚠️ Important Notes

1. **No Server-Side Tracking**: This is client-side only (as requested)
2. **No Conversion API**: Not implemented (as requested)
3. **No Purchase Event**: Since orders happen via WhatsApp, Purchase event would need manual implementation after order confirmation
4. **Privacy**: Pixel complies with Meta's data policies; update privacy policy if needed
5. **Testing**: Always test in production URL (bikitchencr.com), not localhost

---

## 🎉 Next Steps

### Immediate (Week 1):
1. ✅ Verify all events in Meta Events Manager
2. ✅ Create custom audiences (listed above)
3. ✅ Set up conversion tracking for Lead event
4. ⏳ Launch test campaign optimizing for Lead

### Short-term (Month 1):
1. Monitor event quality in Meta
2. Create lookalike audiences from Leads
3. Set up retargeting campaigns for cart abandoners
4. A/B test ad creatives optimized for Lead conversion

### Long-term (Quarter 1):
1. Analyze which content drives most Leads
2. Optimize landing pages based on ViewContent data
3. Implement Purchase event if order tracking becomes available
4. Scale winning campaigns

---

## 📞 Support

- **Pixel ID**: 825371743662986
- **Service File**: `src/services/facebookPixel.js`
- **Documentation**: `docs/FACEBOOK_PIXEL.md`
- **Meta Help**: [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel)

---

**Last Updated**: December 18, 2024  
**Status**: ✅ Production-ready  
**Events Active**: PageView, ViewContent, AddToCart, Lead  
**Domain**: bikitchencr.com
