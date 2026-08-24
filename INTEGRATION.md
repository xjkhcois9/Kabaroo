# ربط صفحة الدليفري مع النظام

## مسار الطلب

الزبون → الشيف → الدليفري → تم التسليم → المبيعات/الأرباح

## حالات الطلب

استخدم حقل `status` داخل `orders` بالقيم:

- `new`
- `preparing`
- `ready`
- `out_for_delivery`
- `delivered`

### الشيف
عند الضغط على "جاهز/Prepared" يجب أن تصبح حالة الطلب:

```js
status: "ready"
```

عندها يظهر الطلب تلقائياً في `delivery.html`.

### الدليفري
- "استلام الطلب وبدء التوصيل" → `out_for_delivery`
- "تم التسليم" → `delivered`

ويتم حفظ:
- `deliveryStartedAt`
- `deliveredAt`
- `updatedAt`

## توافق الحقول

صفحة الدليفري تدعم هذه الأسماء:

- رقم الطاولة: `tableNumber` أو `table`
- اسم الزبون: `customerName` أو `customer`
- الهاتف: `phone` أو `customerPhone`
- الإجمالي: `total` أو `totalPrice`
- الأصناف: `items`
- الحالة: `status` أو `orderStatus`

## Firebase

ضع بيانات مشروعك في `firebase-config.js`، ثم استخدم نفس الملف في جميع صفحات النظام.

## المبيعات والأرباح

هذه الصفحة لا تنشئ سجل مبيعات جديداً عند كل تحديث؛ لأن ذلك قد يؤدي إلى تكرار المبيعات. الأفضل أن تكون عملية إنشاء سجل `sales` مرتبطة بانتقال الطلب إلى `delivered`، مع منع التكرار باستخدام `orderId` كمفتاح/معرف فريد أو Transaction/عملية ذرية في Firestore.

إذا كانت صفحة `waiter.html` الحالية لديك هي التي تنشئ سجل المبيعات، فلا تنشئه مرة ثانية في `delivery.js`.
