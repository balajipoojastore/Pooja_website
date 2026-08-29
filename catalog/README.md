# Catalog source

The selected catalog workbook and `images/` are the client-provided import source. These worksheets are currently imported:

- `Agarbatti & Dhoop`
- `Brass Items`
- `Lakshmi Items`
- `Diyas & Wicks`
- `Kumkum Haldi Chandan`
- `Oils & Ghee`

Image matching uses exact, case-insensitive filename stems within the mapped category folder. JPG, JPEG, PNG, WebP, and AVIF images are validated. AVIF sources are converted to a WebP derivative during upload because the Storage bucket does not accept AVIF; the original source is never modified. `image-overrides.json` records the three visually confirmed path-specific corrections; source files are never renamed or modified.

Run `npm run catalog:validate` before every import. The validator writes JSON and CSV reports without contacting or modifying Supabase. Run `npm run catalog:import` only with server-only Supabase credentials when the report is acceptable.

Known release blockers:

- `A020`, `D018`, and `L007` have no images and remain unpublished.
- `A005` has an image but its source selling price exceeds MRP. The source values remain visible in reports; the database record is staged unpublished at a safe zero selling price and an import issue is recorded until an administrator corrects it.
- `K023` has no image and remains unpublished.
- Incomplete placeholder rows in `Kumkum Haldi Chandan` and `Oils & Ghee` are skipped until their required workbook fields are completed.
