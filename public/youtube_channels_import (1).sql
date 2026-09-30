-- PostgreSQL Database Import Script for YouTube Channels
-- Generated from Notebook: "Guitar Techs and Tube Amplifiers Guide"

DROP TABLE IF EXISTS youtube_channels;

CREATE TABLE youtube_channels (
    id SERIAL PRIMARY KEY,
    channel_name VARCHAR(255) NOT NULL,
    creator_host VARCHAR(255),
    handle VARCHAR(100),
    primary_url TEXT NOT NULL,
    channel_id_url TEXT,
    category_vertical VARCHAR(100),
    subscriber_count VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO youtube_channels (channel_name, creator_host, handle, primary_url, channel_id_url, category_vertical, subscriber_count, description) VALUES
('BERNTH', 'Bernth Brodträger', '@Bernthguitar', 'https://www.youtube.com/@Bernthguitar', 'https://www.youtube.com/channel/UCZvo8TZtUZkLgiH3rJsj-Ow', 'Viral Performance & Shred Technique', '1.55M', 'Austrian metal guitarist known for technical finger-independence exercises and high-concept guitar experiments.'),
('Psionic Audio', 'Lyle Caldwell', '@PsionicAudio', 'https://www.youtube.com/@PsionicAudio', 'https://www.youtube.com/user/psionicaudio', 'Bench Electronics & Tube Amp Repair', '79K', 'Evaluates schematics, power transformer safety, component quality, and PCB layouts across vintage and modern tube amps.'),
('Spectre Sound Studios', 'Glenn Fricker', '@SpectreSoundStudios', 'https://www.youtube.com/@SpectreSoundStudios', 'https://www.youtube.com/channel/UC-f76NUQN5M-Z0cd0MOP5xw', 'Metal Mixing & Gear Critique', '500K', 'Ruthless gear reviews, heavy metal mixing tutorials, and practical recording engineering advice.'),
('The Trogly''s Guitar Show', 'Austin (@Trog)', '@Trog', 'https://www.youtube.com/@Trog', 'https://www.youtube.com/user/MrTrogly', 'Collector Archeology & Guitar Audits', '340K', 'Daily unboxings and evaluations of rare, vintage, and Gibson Custom Shop guitars.'),
('Uncle Doug', 'Uncle Doug', '@UncleDoug', 'https://www.youtube.com/@UncleDoug', 'https://www.youtube.com/user/Stratosaurus1', 'Vintage Tube Amp Restoration', '143K', 'Educational resource for vintage tube amplifier restoration, hand-wired chassis assembly, and circuit theory.'),
('The Studio Rats', 'Paul Drew & James Ivey', '@TheStudioRats', 'https://www.youtube.com/@TheStudioRats', 'https://www.youtube.com/channel/UCW-S0JAM1Rtte4lU0HsD8BA', 'Digital Amp Modeling & Presets', '14K', 'Focuses on dialing in studio-quality tones using digital modelers, impulse responses, and multi-effects units.'),
('Know Your Gear', 'Phil McKnight', '@KnowYourGear', 'https://www.youtube.com/channel/UCEzJtFWNg7d7TZW7K9JyXmw', 'https://www.youtube.com/channel/UCEzJtFWNg7d7TZW7K9JyXmw', 'Guitar Repair & Industry Insights', '46K+', 'Weekly live streams breaking down guitar maintenance, industry supply chains, and gear teardowns.'),
('Guitar MAX', 'Max Carlisle', '@GuitarMAX', 'http://www.maxxxwell.com/guitar-max/', 'https://www.youtube.com/c/GuitarMAX', 'Affordable Gear & Market News', '100K+', 'Specializes in high-value budget gear, scam site exposures, and metal gear demonstrations.'),
('JHS Pedals', 'Josh Scott', '@JHSPedals', 'https://www.youtube.com/@JHSPedals', 'https://www.youtube.com/user/jhspedals', 'Guitar Pedal History & Circuit Design', '581K', 'Digital archive for guitar effects pedal history, circuit topology analysis, and shootouts.'),
('Rick Beato', 'Rick Beato', '@RickBeato', 'https://www.youtube.com/@RickBeato', 'https://www.youtube.com/c/RickBeato', 'Music Theory & Producer Analysis', '5.8M', 'Long-form interviews with iconic musicians, music theory breakdowns, and ''What Makes This Song Great'' analyses.'),
('Jim Lill', 'Jim Lill', '@JimLill', 'https://www.youtube.com/@JimLill', NULL, 'Empirical Audio Testing & Tone Science', 'Substantial', 'Controlled, single-variable scientific experiments testing long-standing tone myths in electric guitars and amps.'),
('Ola Englund', 'Ola Englund', '@OlaEnglund', 'https://www.youtube.com/@OlaEnglund', 'https://www.youtube.com/channel/UCfWdGyZaZODBPQc9Lu0y6aw', 'High-Gain Metal Gear & Commentary', 'Substantial', 'Metal gear testing through ''Will It Chug?'' segments alongside weekly industry vlogs.'),
('Andertons Music Co', 'Lee Anderton & Team', '@AndertonsMusicCo', 'https://www.youtube.com/@AndertonsMusicCo', NULL, 'Retail Media & Product Debuts', '1M+', 'Store shootouts, blind gear challenges, and major product debut demonstrations.'),
('Premier Guitar', 'Editorial Team', '@premierguitar', 'https://www.youtube.com/premierguitar', 'https://www.youtube.com/channel/UC5J-hZ4wNf7OlkzIn49LHoQ', 'Publisher Network & Rig Rundowns', '803K', 'In-depth Rig Rundowns documenting touring artists'' exact signal chains, amplifiers, and pedalboards.'),
('Guitar World', 'Editorial Team', '@GuitarWorld', 'https://www.youtube.com/channel/UCqHkFMEmOPFO3ahcrrBAj4w', 'https://www.youtube.com/channel/UCqHkFMEmOPFO3ahcrrBAj4w', 'Publisher Network & Artist Features', '859K', 'Top-flight coverage of major artists, exclusive gear lessons, and industry news.'),
('Guitar Center', 'Retail Team', '@guitarcenter', 'https://www.youtube.com/guitarcenter', 'https://www.youtube.com/channel/UCr4kaFJ16UqtDQRzadrVkzw', 'Retail Media & Artist Performance', '1.2M', 'Inside the Noise podcasts, gear features, and artist performance sessions.'),
('Marty Music', 'Marty Schwartz', '@MartyMusic', 'https://youtube.com/@MartyMusic', 'https://www.youtube.com/channel/UCmnlTWVJysjWPFiZhQ5uudg', 'Instructional Lessons & Song Tutorials', '4.9M', 'Premier destination for accessible guitar instruction, song tutorials, and gear reviews.'),
('Paul Davids', 'Paul Davids', '@PaulDavids', 'https://www.youtube.com/channel/UC_Oa7Ph3v94om5OyxY1nPKg', 'https://www.youtube.com/channel/UC_Oa7Ph3v94om5OyxY1nPKg', 'Aesthetic Education & Gear Demos', '3.7M', 'Cinematic guitar tutorials, acoustic arrangements, sound comparisons, and lessons.'),
('60 Cycle Hum', 'Ryan & Steve', '@60CycleHumCast', 'https://youtube.com/@60CycleHumCast', 'https://60cyclehumcast.com/', 'Surf Gear, Offsets & Market Reviews', 'Macro', 'Podcast and review hybrid covering Craigslist deal reviews, surf gear, and budget offset guitars.'),
('Pat Finnerty', 'Pat Finnerty', '@PatFinnerty', 'https://www.youtube.com/@PatFinnerty', NULL, 'Satirical Commentary & Critique', 'Macro', 'Long-form satirical video essays breaking down bad guitar tone, overhyped trends, and marketing tropes.'),
('Perfecto De Castro', 'Perfecto De Castro', '@officialperfectodecastro', 'http://youtube.com/@officialperfectodecastro', NULL, 'Gear Demos & Virtuoso Performance', 'Macro', 'Filipino guitar icon featuring gear reviews, livestreams, amp modeler preset demos, and tutorials.');
