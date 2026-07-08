UPDATE product_images SET file_url = 'https://pub-3c5e5d13140b42bfbdcfa583ae57a2cd.r2.dev/products/' || file_url;
UPDATE technical_drawings SET file_url = 'https://pub-3c5e5d13140b42bfbdcfa583ae57a2cd.r2.dev/drawings/' || ref_key;
UPDATE certificates SET file_url_tr = 'https://pub-3c5e5d13140b42bfbdcfa583ae57a2cd.r2.dev/certificates/' || file_url_tr WHERE file_url_tr IS NOT NULL;
UPDATE certificates SET file_url_en = 'https://pub-3c5e5d13140b42bfbdcfa583ae57a2cd.r2.dev/certificates/' || file_url_en WHERE file_url_en IS NOT NULL;
UPDATE documents SET file_url_tr = 'https://pub-3c5e5d13140b42bfbdcfa583ae57a2cd.r2.dev/documents/' || file_url_tr WHERE file_url_tr IS NOT NULL;
UPDATE documents SET file_url_en = 'https://pub-3c5e5d13140b42bfbdcfa583ae57a2cd.r2.dev/documents/' || file_url_en WHERE file_url_en IS NOT NULL;
