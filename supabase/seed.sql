insert into public.categories(name,slug,description,sort_order,is_active) values
('Agarbatti & Dhoop','agarbatti-dhoop','Fragrant agarbatti, dhoop sticks, cones and sambrani.',10,true),
('Brass Items','brass-items','Traditional brass and copper vessels, lamps and ritualware.',20,true),
('Lakshmi Items','lakshmi-items','Auspicious adornments and offerings for Lakshmi pooja.',30,true),
('Diyas & Wicks','diyas-wicks','Clay diyas and cotton wicks for daily and festive light.',40,true),
('Kumkum Haldi Chandan','kumkum-haldi-chandan','Kumkum, turmeric, chandan and sacred powders for daily rituals.',50,true),
('Oils & Ghee','oils-ghee','Lamp oils, pooja ghee and related ritual essentials.',60,true)
on conflict(slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,is_active=true;

insert into public.site_content(section,content_key,content_value,content_type,is_public) values
('brand','store_name','The Pooja House','text',true),
('brand','store_tagline','Sacred essentials, thoughtfully brought home.','text',true),
('header','header_announcement','Authentic pooja essentials • Cash on Delivery','text',true),
('contact','contact_phone','+91 90000 00000','text',true),
('contact','contact_email','care@thepoojahouse.example','text',true),
('contact','support_hours','Daily, 7 AM – 9 PM','text',true),
('contact','address','Temple Road, Bengaluru, Karnataka','text',true),
('footer','footer_description','A considered collection for daily rituals, celebrations, and moments of devotion.','text',true),
('festival','festival_heading','Auspicious picks for every celebration','text',true),
('festival','festival_description','Bring warmth and tradition home with our seasonal edit.','text',true),
('delivery','delivery_charge_paise','0','number',true),
('delivery','free_delivery_threshold_paise','0','number',true),
('legal','store_terms','I agree to the store terms, Cash on Delivery conditions, and the no replacement, return or refund policy after delivery.','text',true),
('announcements','general_announcement','','text',true),
('reviews','reviews','[{"id":"review-1","author":"Ananya R.","rating":5,"quote":"Beautifully packed and exactly as shown."}]','json',true)
on conflict(content_key) do nothing;

-- Required local delivery area. Re-running the seed keeps it serviceable.
insert into public.serviceable_pincodes(pincode,area_name,delivery_fee_paise,minimum_order_paise,is_active) values
('560087','Delivery Area 560087',0,59900,true)
on conflict(pincode) do update
set minimum_order_paise=excluded.minimum_order_paise,
    is_active=true,
    updated_at=now();
