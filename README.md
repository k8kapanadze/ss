# ss

SIMED - Status In Medicina არის სამედიცინო ტესტირების პლატფორმა. აპი მუშაობს React/Vite-ზე, ინახავს მონაცემებს ბრაუზერის `localStorage`-ში და GitHub Pages-ზე ქვეყნდება GitHub Actions-ით.

## გაშვება

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Deployment

Repository: `k8kapanadze/ss`

Custom domain: `s.imed.com.ge`

GitHub Pages-ში Source უნდა იყოს `GitHub Actions`. `public/CNAME` ფაილი ინარჩუნებს custom domain-ს deploy-ის შემდეგ.
