<?php
declare(strict_types=1);

// CLI-only fixture; no reads from Desktop exports or stations.txt at runtime.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit();
}
require_once __DIR__ . '/api/helpers.php';

/** @return list<array<string, mixed>> */
function seed_rows(): array
{
    $json = <<<'JSON'
    [
      {
        "id": "656d8ebe-d66e-4d51-adb5-2ae00b902ba5",
        "amount": 200.0,
        "liters": 2.7,
        "odometer": 10.0,
        "dateTime": "2026-06-18T14:22:00+08:00",
        "station": "Uno Fuel",
        "grade": "Unleaded",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1781763720000
      },
      {
        "id": "91507d76-00a7-4d5b-8576-9b4a1867936e",
        "amount": 250.0,
        "liters": 2.668,
        "odometer": 162.4,
        "dateTime": "2026-06-22T14:25:00+08:00",
        "station": "CLEANTECH",
        "grade": "Unleaded",
        "gaugeLevel": 6,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1782109500001
      },
      {
        "id": "4a5186a8-9ba4-467c-87b2-23024646eebe",
        "amount": 100.0,
        "liters": 1.364,
        "odometer": 274.0,
        "dateTime": "2026-06-28T14:27:00+08:00",
        "station": "Petron",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1782628020002
      },
      {
        "id": "b5e44246-c434-46e5-838e-0b0a61923823",
        "amount": 200.0,
        "liters": 2.239,
        "odometer": 426.3,
        "dateTime": "2026-07-02T14:26:00+08:00",
        "station": "Uno Fuel",
        "grade": "Unleaded",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1782973560003
      },
      {
        "id": "704b90b2-0b71-4404-ad3a-9c8c207d5622",
        "amount": 100.0,
        "liters": 1.078,
        "odometer": 592.1,
        "dateTime": "2026-07-04T14:23:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1783146180004
      },
      {
        "id": "c879b4af-dfe1-42e7-8d16-879a1c6b359e",
        "amount": 250.0,
        "liters": 3.298,
        "odometer": 719.1,
        "dateTime": "2026-07-06T14:35:00+08:00",
        "station": "Petron",
        "grade": "Unleaded",
        "gaugeLevel": 6,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1783319700005
      },
      {
        "id": "bcf865f2-a6fe-4658-9319-4e63bc31c63d",
        "amount": 200.0,
        "liters": 2.175,
        "odometer": 873.0,
        "dateTime": "2026-07-13T14:37:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1783924620006
      },
      {
        "id": "338102f9-08b4-4e91-a1e7-f6f26df33538",
        "amount": 100.0,
        "liters": 1.133,
        "odometer": 979.1,
        "dateTime": "2026-07-23T14:31:00+08:00",
        "station": "CLEANTECH",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1784788260007
      },
      {
        "id": "937ee545-0ccd-41da-a7c4-3024f7206879",
        "amount": 100.0,
        "liters": 1.244,
        "odometer": 1050.0,
        "dateTime": "2026-07-24T14:35:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1784874900008
      },
      {
        "id": "b693ac29-a619-4aca-8422-ba38e71ba215",
        "amount": 100.0,
        "liters": 1.143,
        "odometer": 1130.0,
        "dateTime": "2026-07-28T14:34:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1785220440009
      },
      {
        "id": "bb9a1eb9-1f6a-4b6a-908d-f2ba7a13c565",
        "amount": 100.0,
        "liters": 1.319,
        "odometer": 1220.0,
        "dateTime": "2026-07-30T14:25:00+08:00",
        "station": "CLEANTECH",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1785392700010
      },
      {
        "id": "03e285e6-f7b1-4ae8-b136-11f2e18b1a63",
        "amount": 100.0,
        "liters": 1.23,
        "odometer": 1327.8,
        "dateTime": "2026-08-01T14:25:00+08:00",
        "station": "Petron",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters, odometer. Other recorded input values preserved.",
        "createdAt": 1785565500011
      },
      {
        "id": "02395e6b-7dd8-4c79-900a-4d53ae4abc34",
        "amount": 100.0,
        "liters": 1.336,
        "odometer": 1407.0,
        "dateTime": "2026-08-09T14:33:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1786257180012
      },
      {
        "id": "bb420ec9-a055-425f-9d22-be91c016d354",
        "amount": 200.0,
        "liters": 2.59,
        "odometer": 1475.0,
        "dateTime": "2026-08-11T14:24:00+08:00",
        "station": "CLEANTECH",
        "grade": "Unleaded",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1786429440013
      },
      {
        "id": "aca34ea5-035d-41ad-a63c-2b09cef79ac1",
        "amount": 200.0,
        "liters": 2.775,
        "odometer": 1620.0,
        "dateTime": "2026-08-16T14:28:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time, liters. Other recorded input values preserved.",
        "createdAt": 1786861680014
      },
      {
        "id": "105a435b-933a-4dc5-a998-4187b4a80fca",
        "amount": 100.0,
        "liters": 1.35,
        "odometer": 1728.0,
        "dateTime": "2026-08-20T14:32:00+08:00",
        "station": "Uno Fuel",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1787207520015
      },
      {
        "id": "29b5c859-d9c7-4c78-bb2c-5ea7a1742df9",
        "amount": 100.0,
        "liters": 1.35,
        "odometer": 1814.0,
        "dateTime": "2026-08-22T14:23:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1787379780016
      },
      {
        "id": "a23f4c8d-6b4a-4767-94a5-1032480d153b",
        "amount": 100.0,
        "liters": 1.38,
        "odometer": 1881.0,
        "dateTime": "2026-08-23T14:25:00+08:00",
        "station": "Petron",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1787466300017
      },
      {
        "id": "864ff6c3-5d80-4965-8050-60e6f3b0f1c1",
        "amount": 200.0,
        "liters": 2.805,
        "odometer": 1952.0,
        "dateTime": "2026-08-25T14:30:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1787639400018
      },
      {
        "id": "1ee13c35-9f94-4142-9683-30e6b5778299",
        "amount": 100.0,
        "liters": 1.407,
        "odometer": 2081.0,
        "dateTime": "2026-09-03T14:34:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1788417240019
      },
      {
        "id": "dbc14115-9d86-470e-a7b2-b3c2e502ad08",
        "amount": 200.0,
        "liters": 2.67,
        "odometer": 2139.0,
        "dateTime": "2026-09-07T14:28:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1788762480020
      },
      {
        "id": "3031d244-b186-4338-beb3-681e54266b9a",
        "amount": 250.0,
        "liters": 3.467,
        "odometer": 2287.0,
        "dateTime": "2026-09-13T14:31:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 6,
        "filledToFull": true,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1789281060021
      },
      {
        "id": "7d3c72c6-0f31-410b-a096-349fb3df95dc",
        "amount": 200.0,
        "liters": 2.545,
        "odometer": 2424.0,
        "dateTime": "2026-09-17T14:29:00+08:00",
        "station": "CLEANTECH",
        "grade": "Unleaded",
        "gaugeLevel": 6,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1789626540022
      },
      {
        "id": "249b2db9-4018-429c-a395-d1e1ed2ab4a9",
        "amount": 200.0,
        "liters": 2.527,
        "odometer": 2583.0,
        "dateTime": "2026-09-20T14:30:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 4,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1789885800023
      },
      {
        "id": "826e3997-e77e-4c6e-985f-67448db50cfe",
        "amount": 100.0,
        "liters": 1.182,
        "odometer": 2662.0,
        "dateTime": "2026-09-22T14:34:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1790058840024
      },
      {
        "id": "bd476e27-fdfa-4b4f-b898-19256c480d7c",
        "amount": 348.16,
        "liters": 4.325,
        "odometer": 2788.0,
        "dateTime": "2026-09-27T12:06:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 6,
        "filledToFull": true,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1790481960025
      },
      {
        "id": "832ad6d8-68e6-4e97-925f-4ad6c3532f2c",
        "amount": 100.0,
        "liters": 1.056,
        "odometer": 3010.0,
        "dateTime": "2026-09-27T16:58:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 2,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1790499480026
      },
      {
        "id": "e167a871-8862-46e9-885a-20e8ec439f5c",
        "amount": 200.0,
        "liters": 2.11,
        "odometer": 3080.0,
        "dateTime": "2026-09-28T09:52:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1790560320027
      },
      {
        "id": "afc2e307-b0ac-4cd6-a3fd-688d54654592",
        "amount": 300.0,
        "liters": 3.48,
        "odometer": 3188.0,
        "dateTime": "2026-09-28T12:26:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 6,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1790569560028
      },
      {
        "id": "48ae100b-a657-460f-bc9e-69670aec2db6",
        "amount": 50.0,
        "liters": 0.527,
        "odometer": 3259.6,
        "dateTime": "2026-09-28T15:20:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 2,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, odometer. Other recorded input values preserved.",
        "createdAt": 1790580000029
      },
      {
        "id": "a784814a-bd7b-4982-8d6c-2de4c3abafd2",
        "amount": 50.0,
        "liters": 0.6,
        "odometer": 3366.0,
        "dateTime": "2026-10-01T14:30:00+08:00",
        "station": "Uno Fuel",
        "grade": "Unleaded",
        "gaugeLevel": 2,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1790836200030
      },
      {
        "id": "70c7a58c-8335-4875-99dd-be9c55185856",
        "amount": 50.0,
        "liters": 0.62,
        "odometer": 3388.0,
        "dateTime": "2026-10-03T14:33:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 2,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1791009180031
      },
      {
        "id": "d37fba97-c80a-44c5-8625-dfc65c805df6",
        "amount": 50.0,
        "liters": 0.62,
        "odometer": 3426.0,
        "dateTime": "2026-10-05T14:26:00+08:00",
        "station": "Petron",
        "grade": "Unleaded",
        "gaugeLevel": 2,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1791181560032
      },
      {
        "id": "927a01e3-8889-44de-8b33-4d9630c1aea7",
        "amount": 200.0,
        "liters": 2.422,
        "odometer": 3476.0,
        "dateTime": "2026-10-06T14:23:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1791267780033
      },
      {
        "id": "eb6dfae7-a1ae-4b1b-938a-f882bfb00c94",
        "amount": 100.0,
        "liters": 1.242,
        "odometer": 3570.0,
        "dateTime": "2026-10-08T14:27:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1791440820034
      },
      {
        "id": "dc33f902-ea14-4546-94d7-950c3e7ba9e8",
        "amount": 300.0,
        "liters": 3.727,
        "odometer": 3672.0,
        "dateTime": "2026-10-12T14:38:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 6,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1791787080035
      },
      {
        "id": "9e511529-3790-4f74-8003-e5078e3c964c",
        "amount": 200.0,
        "liters": 2.58,
        "odometer": 3825.0,
        "dateTime": "2026-10-27T14:33:00+08:00",
        "station": "Uno Fuel",
        "grade": "Premium",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1793082780036
      },
      {
        "id": "d986e237-332d-4d77-819d-a71ec5f0fb24",
        "amount": 100.0,
        "liters": 1.257,
        "odometer": 3905.0,
        "dateTime": "2026-10-28T14:29:00+08:00",
        "station": "CLEANTECH",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade, time. Other recorded input values preserved.",
        "createdAt": 1793168940037
      },
      {
        "id": "8c711b28-a0e5-4832-98c3-42e7249ea8cc",
        "amount": 100.0,
        "liters": 1.272,
        "odometer": 3976.0,
        "dateTime": "2026-10-31T21:44:00+08:00",
        "station": "Petron",
        "grade": "Unleaded",
        "gaugeLevel": 3,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade. Other recorded input values preserved.",
        "createdAt": 1793454240038
      },
      {
        "id": "df4430f3-a8ad-49eb-8b41-dd75860fccb8",
        "amount": 200.0,
        "liters": 2.545,
        "odometer": 4036.0,
        "dateTime": "2026-11-01T16:21:00+08:00",
        "station": "Uno Fuel",
        "grade": "Unleaded",
        "gaugeLevel": 5,
        "filledToFull": false,
        "latitude": 15.4273549,
        "longitude": 120.9549514,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade. Other recorded input values preserved.",
        "createdAt": 1793521260039
      },
      {
        "id": "9efb9209-dec9-4adf-a281-b3d1358ee360",
        "amount": 200.0,
        "liters": 2.545,
        "odometer": 4143.0,
        "dateTime": "2026-11-03T02:49:00+08:00",
        "station": "CLEANTECH",
        "grade": "Premium",
        "gaugeLevel": 5,
        "filledToFull": false,
        "latitude": 15.428016,
        "longitude": 120.9543929,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade. Other recorded input values preserved.",
        "createdAt": 1793645340040
      },
      {
        "id": "d37d1c59-e950-480b-9103-eb4208b58d9d",
        "amount": 150.0,
        "liters": 1.877,
        "odometer": 4244.0,
        "dateTime": "2026-11-05T14:11:00+08:00",
        "station": "Petron",
        "grade": "Premium",
        "gaugeLevel": 5,
        "filledToFull": false,
        "latitude": 15.4556925,
        "longitude": 120.9487661,
        "notes": "Manual testing seed. Synthetic: station, coordinates, grade. Other recorded input values preserved.",
        "createdAt": 1793859060041
      }
    ]
    JSON;
    return json_decode($json, true, 32, JSON_THROW_ON_ERROR);
}

/** @return array<string, list<string>> */
function seed_columns(): array
{
    return [
        'settings' => ['id', 'payload'],
        'fillups' => [
            'id',
            'amount',
            'liters',
            'odometer',
            'date_time',
            'station',
            'grade',
            'gauge_level',
            'filled_to_full',
            'latitude',
            'longitude',
            'notes',
            'created_at',
        ],
        'mutation_receipts' => ['operation_id', 'fingerprint', 'status', 'payload', 'created_at'],
    ];
}

/** @param array<string, mixed> $settings
 *  @return list<array<string, mixed>>
 */
function seed_validated_rows(array $settings): array
{
    $result = [];
    foreach (seed_rows() as $row) {
        $fill = validate_fill($row, $settings);
        validate_placement($result, $fill);
        $result[] = $fill;
    }
    $ids = [];
    $total = 0.0;
    foreach ($result as $fill) {
        $ids[] = uuid($fill['id']);
        $total += db_number($fill['amount']);
    }
    if (count(array_unique($ids)) !== 42 || abs($total - 6548.16) > 0.001) {
        throw new RuntimeException('Seed count or spending checksum failed.');
    }
    return $result;
}

/** @return array<string, list<array<string, mixed>>> */
function seed_snapshot(PDO $pdo): array
{
    $tables = [];
    foreach (seed_columns() as $table => $columns) {
        $tables[$table] = [];
        foreach (
            query_statement(
                $pdo,
                'SELECT ' . implode(',', $columns) . ' FROM ' . $table,
            )->fetchAll()
            as $row
        ) {
            $tables[$table][] = object_array($row);
        }
    }
    return $tables;
}

/** @param array<string, list<array<string, mixed>>> $tables */
function seed_replace(PDO $pdo, array $tables): void
{
    foreach (seed_columns() as $table => $columns) {
        $pdo->exec('DELETE FROM ' . $table);
        $stmt = $pdo->prepare(
            'INSERT INTO ' .
                $table .
                ' (' .
                implode(',', $columns) .
                ') VALUES (' .
                implode(',', array_fill(0, count($columns), '?')) .
                ')',
        );
        foreach ($tables[$table] as $row) {
            $values = [];
            foreach ($columns as $column) {
                $value = $row[$column];
                if (!is_scalar($value) && $value !== null) {
                    throw new RuntimeException('Invalid backup value.');
                }
                $values[] = $value;
            }
            $stmt->execute($values);
        }
    }
}

/** @param array<string, list<array<string, mixed>>> $tables */
function seed_write_backup(PDO $pdo, array $tables, string $directory): string
{
    if (file_exists($directory) && !is_dir($directory)) {
        throw new RuntimeException('Backup path is not a directory.');
    }
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create backup directory.');
    }
    $path =
        $directory . '/seed-backup-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.json';
    $json = json_encode(
        [
            'version' => 1,
            'database' => query_statement($pdo, 'SELECT DATABASE()')->fetchColumn(),
            'createdAt' => gmdate(DATE_ATOM),
            'tables' => $tables,
        ],
        JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR,
    );
    $file = fopen($path, 'x');
    if ($file === false) {
        throw new RuntimeException('Cannot open backup.');
    }
    try {
        if (fwrite($file, $json) !== strlen($json) || !fflush($file)) {
            throw new RuntimeException('Cannot finish backup. Database unchanged.');
        }
    } finally {
        fclose($file);
    }
    return $path;
}

/** @return array<string, list<array<string, mixed>>> */
function seed_read_backup(PDO $pdo, string $path): array
{
    $raw = file_get_contents($path);
    if ($raw === false) {
        throw new RuntimeException('Cannot read backup.');
    }
    $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    if (
        !is_array($decoded) ||
        ($decoded['version'] ?? null) !== 1 ||
        ($decoded['database'] ?? null) !==
            query_statement($pdo, 'SELECT DATABASE()')->fetchColumn() ||
        !is_array($decoded['tables'] ?? null)
    ) {
        throw new RuntimeException('Backup version or database does not match.');
    }
    $tables = [];
    foreach (seed_columns() as $table => $columns) {
        $rows = $decoded['tables'][$table] ?? null;
        if (!is_array($rows) || !array_is_list($rows)) {
            throw new RuntimeException('Invalid backup table: ' . $table);
        }
        $tables[$table] = [];
        foreach ($rows as $row) {
            if (!is_array($row) || count($row) !== count($columns)) {
                throw new RuntimeException('Invalid backup columns.');
            }
            foreach ($columns as $column) {
                if (
                    !array_key_exists($column, $row) ||
                    (!is_scalar($row[$column]) && $row[$column] !== null)
                ) {
                    throw new RuntimeException('Invalid backup field: ' . $column);
                }
            }
            $tables[$table][] = object_array($row);
        }
    }
    if (count($tables['settings']) !== 1 || db_number($tables['settings'][0]['id']) !== 1.0) {
        throw new RuntimeException('Missing singleton settings.');
    }
    return $tables;
}

/** Back up under the same settings-row lock used by API writers, then atomically replace.
 *  @param array<string, list<array<string, mixed>>>|null $restore
 */
function seed_apply(PDO $pdo, string $backupDirectory, ?array $restore = null): string
{
    $pdo->beginTransaction();
    try {
        query_statement($pdo, 'SELECT id FROM settings WHERE id = 1 FOR UPDATE')->fetch();
        $before = seed_snapshot($pdo);
        if ($restore === null) {
            $settings = get_settings($pdo);
            $settings['stations'] = catalog(
                [...$settings['stations'], 'Uno Fuel', 'CLEANTECH', 'Petron'],
                'stations',
            );
            $settings['grades'] = catalog(
                [...$settings['grades'], 'Unleaded', 'Premium'],
                'grades',
            );
            $fills = seed_validated_rows($settings);
            $restore = [
                'settings' => [
                    ['id' => 1, 'payload' => json_encode($settings, JSON_THROW_ON_ERROR)],
                ],
                'fillups' => [],
                'mutation_receipts' => [],
            ];
            foreach ($fills as $fill) {
                $restore['fillups'][] = [
                    'id' => $fill['id'],
                    'amount' => $fill['amount'],
                    'liters' => $fill['liters'],
                    'odometer' => $fill['odometer'],
                    'date_time' => $fill['dateTime'],
                    'station' => $fill['station'],
                    'grade' => $fill['grade'],
                    'gauge_level' => $fill['gaugeLevel'],
                    'filled_to_full' => $fill['filledToFull'] ? 1 : 0,
                    'latitude' => $fill['latitude'],
                    'longitude' => $fill['longitude'],
                    'notes' => $fill['notes'],
                    'created_at' => $fill['createdAt'],
                ];
            }
        }
        $backup = seed_write_backup($pdo, $before, $backupDirectory);
        seed_replace($pdo, $restore);
        $pdo->commit();
        return $backup;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

/** @param list<string> $arguments */
function seed_main(array $arguments): int
{
    try {
        if ($arguments === ['--help']) {
            echo "Preview: php seed.php\nApply: php seed.php --apply\nRestore: php seed.php --restore <backup.json>\nFinish pending app sync and close app tabs before apply/restore.\n";
            return 0;
        }
        $apply = $arguments === ['--apply'];
        $restore = count($arguments) === 2 && $arguments[0] === '--restore';
        if ($arguments !== [] && !$apply && !$restore) {
            throw new RuntimeException('Use --help for supported commands.');
        }
        $pdo = database();
        $directory = dirname(__DIR__) . '/artifacts';
        if ($restore) {
            $backup = seed_apply($pdo, $directory, seed_read_backup($pdo, $arguments[1]));
            echo "Restored database. Pre-restore backup: $backup\n";
        } elseif ($apply) {
            $backup = seed_apply($pdo, $directory);
            echo "Seeded 42 fill-ups; total PHP 6548.16. Backup: $backup\nReopen/refresh the app to fetch the seed. Pending offline changes can reappear if they were not synced first.\n";
        } else {
            $fills = seed_validated_rows(get_settings($pdo));
            echo json_encode(
                [
                    'mode' => 'preview (no writes)',
                    'count' => count($fills),
                    'totalPHP' => 6548.16,
                    'fills' => $fills,
                ],
                JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR,
            ) . "\n";
        }
        return 0;
    } catch (Throwable $error) {
        fwrite(STDERR, $error->getMessage() . "\n");
        return 1;
    }
}

if (
    is_string($_SERVER['SCRIPT_FILENAME'] ?? null) &&
    realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__
) {
    exit(seed_main(array_slice($argv, 1)));
}
