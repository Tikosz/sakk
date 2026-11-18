# Firebase bekötése

A játék GitHub Pagesen fut. Az online lobbyhoz a projektben az alábbiakat kell bekapcsolni:

1. Firebase Console → **Authentication → Sign-in method** → kapcsold be az **Anonymous** bejelentkezést.
2. Firebase Console → **Realtime Database → Create database**. Válassz európai régiót, majd a létrehozás után nyisd meg a **Rules** fület.
3. A [database.rules.json](database.rules.json) tartalmát másold be a Rules szerkesztőbe, majd kattints a **Publish** gombra. Ne hagyd a tesztmód alapértelmezett, mindenki számára írható szabályait.
4. Firebase Console → **Authentication → Settings → Authorized domains**. Legyen benne `tikosz.github.io`.
5. A webapp konfigurációja a [firebase-config.js](firebase-config.js) fájlban van. A megadott Realtime Database URL-t már beírtam.

Ezután a `main` branchre feltöltött módosítás automatikusan elindítja a GitHub Pages deployt. A konfiguráció webes klienskonfiguráció, ezért nyilvános lehet. A szabályok biztosítják, hogy egy felhasználó a saját profilját és jelenlétét írja; a játékoslista és a jelenléti adatok bejelentkezett játékosoknak olvashatók.

## Használati korlátok

A Firebase Spark csomag kis baráti játékhoz megfelelő lehet, de használati korlátai vannak. Ha eléritek, az adatbázis forgalma korlátozódhat. A részletek a [Firebase árazási oldalon](https://firebase.google.com/pricing) találhatók.
