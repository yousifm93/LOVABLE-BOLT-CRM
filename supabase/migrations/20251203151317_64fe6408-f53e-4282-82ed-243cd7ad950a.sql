-- Add unique constraint on lender_name for upsert support
ALTER TABLE lenders ADD CONSTRAINT lenders_lender_name_key UNIQUE (lender_name);

-- Delete existing lenders to avoid conflicts, then insert fresh
DELETE FROM lenders;

-- Insert all 34 lenders
INSERT INTO lenders (lender_name, lender_type, account_executive, account_executive_email, account_executive_phone, broker_portal_url, broker_portal_username, broker_portal_password, min_loan_amount, max_loan_amount, status)
VALUES 
  ('A&D', 'Non-QM', 'David Wilson', 'david.wilson@admortgage.com', '7866779669', 'https://aim.admortgage.com/home', 'yousif@mortgagebolt.com', 'Mortgagebolt93!', 100000, 4000000, 'Active'),
  ('ACRA', 'Non-QM', 'Christina Fairbanks', 'christina.fairbanks@acralending.com', '14153499001', 'https://alglide.com/login', NULL, NULL, 100000, 4000000, 'Active'),
  ('ADVANCIAL', 'Conventional', 'Courtney Mercer', 'cmercer@advancialmortgage.com', '19722011782', 'https://www.advancial.org/wholesale/', NULL, NULL, 75000, 5000000, 'Active'),
  ('AMWEST', 'Conventional', 'Christopher Gandara', 'Christopher.Gandara@amwestfunding.com', '17867683782', 'https://www.amwestwholesale.com/', 'yousif.mohamed', 'Bolt2025!', 50000, 3500000, 'Active'),
  ('ANGEL OAK', 'Non-QM', 'Scott Greubele', 'scott.gruebele@angeloakms.com', '17544235117', 'https://2884351510.encompasstpoconnect.com/', 'yousif@mortgagebolt.com', '54618f92', 150000, 4000000, 'Active'),
  ('BAC', 'Non-QM', 'Baine Leon', 'bleon@bradescobank.com', '3057898066', 'https://wholesale.bradescobank.com/', 'yousif@mortgagebolt.com', '47282f22', 200000, 4000000, 'Active'),
  ('BB AMERICAS', 'Conventional', 'Robert Gutlohn', 'wholesale@bbamericas.com', '13057948183', 'https://wholesale.bbamericas.com/', NULL, NULL, 200000, 10000000, 'Active'),
  ('CHAMPIONS', 'Non-QM', 'Mario Lopez', 'mario@champstpo.com', '19252060537', 'https://hero.champstpo.com/Auth/Login', 'Yousif@Mohamed', 'Boltmortgage2025!', 100000, 5000000, 'Active'),
  ('CHANGE', 'Non-QM', 'Carlos Cabezas', 'carlos.cabezas@changewholesale.com', '13054902188', 'https://portal.changelendingllc.com/', 'yousif@mortgagebolt.com', 'Mortgagebolt2025!', 100000, 3500000, 'Active'),
  ('CLICK N'' CLOSE', 'Conventional', 'Bob Paglia', 'bob.paglia@clicknclose.com', '19549935002', 'https://mam.mmachine.net/LogIn.aspx', 'Yousif.Mohamed', 'MortgageBolt2025!!!', 50000, 819000, 'Active'),
  ('DEEPHAVEN', 'Non-QM', 'Mark Latsko', 'mlatsko@deephavenmortgage.com', '17047418419', 'https://dhmwhsl.encompasstpoconnect.com/', 'yousif@mortgagebolt.com', 'dc787a3b', 100000, 3500000, 'Active'),
  ('EPM', 'Conventional', 'Brian O''Leary', 'BOLeary@epm.net', '14012069709', 'https://epmcore.com/login', 'yousif@mortgagebolt.com', 'Yousmo93!!', 50000, 3500000, 'Active'),
  ('EVERSTREAM', 'Conventional', 'Yvonne Rupp', 'yvonne.rupp@everstreammortgage.com', '12673764366', 'https://prod.lendingpad.com/everstream/login', 'yousif@mortgagebolt.com', 'Bolt2025!', 50000, 4000000, 'Active'),
  ('FEMBI', 'Conventional', 'Ed Wilburn', 'ed.wilburn@fembi.com', '13055059040', 'https://brokers.fembi.com/', 'partner', 'broker@2025', 75000, 2000000, 'Active'),
  ('FUND LOANS', 'Non-QM', 'Sean Murray', 'smurray@fundloans.com', '16097908806', 'https://tpo.fundloans.com/', 'yousif@mortgagebolt.com', 'Bolt2025!', 200000, 6000000, 'Active'),
  ('JMAC Lending', 'Conventional', 'Michelle Smith', 'michelle.smith@jmaclending.com', '17727082857', 'https://2097894541.encompasstpoconnect.com/', 'yousif@mortgagebolt.com', '62160adc', 75000, 3500000, 'Active'),
  ('KIND LENDING', 'Conventional', 'Rick Fabricio', 'rfabrico@kindlending.com', '13057223748', 'https://kwikie.kindlending.com/login', 'yousif@mortgagebolt.com', 'Bolt2025!', 75000, 3000000, 'Active'),
  ('LEND SURE', 'Non-QM', 'Spencer Penrod', 'spenrod@lendsure.com', '18015986927', 'https://lendsure.my.site.com/s/login/', 'yousif@mortgagebolt.com', 'Mortgagebolt2025!!!', 150000, 3000000, 'Active'),
  ('LENDZ FINANCIAL', 'Non-QM', 'Justin Smith', 'justin.smith@lendzfinancial.com', '13052046803', 'https://prod.lendingpad.com/lendz/login', 'info+broker972@lendzfinancial.com', 'Broker!234567', 100000, 3500000, 'Active'),
  ('NEW WAVE', 'Conventional', 'Hanh Hoang', 'hanh.hoang@newwavelending.com', '16263150048', 'https://www.newwavelending.com/', 'yousif@mortgagebolt.com', 'Bolt2025!', 100000, 3500000, 'Active'),
  ('NEWFI', 'Non-QM', 'Annu Gyani', 'AGyani@Newfi.com', '17869109485', 'https://broker.newfiwholesale.com/index.html', 'yousif@mortgagebolt.com', 'NewfiLending2468#1', 100000, 5000000, 'Active'),
  ('NEWREZ', 'Conventional', 'Amanda Schmidt', 'Amanda.Schmidt@newrez.com', '18589973003', 'https://blueprint.newrezwholesale.com/dashboard', 'yousif@mortgagebolt.com', 'Yousmo93!!', 100000, 3500000, 'Active'),
  ('PENNYMAC', 'Conventional', 'David Gross', 'david.gross@pennymac.com', '19542880691', 'https://power.pennymac.com/', 'yousif@mortgagebolt.com', 'Yousmo93!!', 50000, 3500000, 'Active'),
  ('POWERTPO', 'Conventional', 'Zuly Munoz', 'zmunoz@powertpo.com', '13057964765', 'https://portal.powertpo.com/', 'yousif@mortgagebolt.com', '599308c7', 75000, 3000000, 'Active'),
  ('PRMG', 'Conventional', 'Charles Ryan', 'CRyan@prmg.net', '14044055310', 'https://tpo.prmg.net/', 'yousif@mortgagebolt.com', 'Mortgagebolt93!', 50000, 3500000, 'Active'),
  ('PROVIDENT', 'Conventional', 'Kim Jordan', 'kjordan@provident.com', '14122785974', 'https://pfloans.provident.com/', 'yousifmortgagebolt1', 'Bolt2025!', 50000, 2000000, 'Active'),
  ('REMINGTON', 'Conventional', 'Mark Mccullough', 'mark.mccullough@remn.com', '19046076278', 'https://hub.remnwholesale.com/portal/#/login', 'yousif@mortgagebolt.com', 'Semnis@@23', 25000, 3500000, 'Active'),
  ('SIERRA PACIFIC', 'Conventional', 'Fay Hoffman', 'fay.hoffman@sierrapacificmortgage.com', '15102201330', 'https://www.sierrapacificmortgage.com/net/SPMLogin/', 'yousif@mortgagebolt.com', 'Bolt2025', 100000, 3000000, 'Active'),
  ('SPRING EQ', 'HELOC', 'Justin Sutton', 'justin.sutton@springeq.com', '12677388602', 'https://wholesale.springeq.com/', 'b-YousifMohamed', 'e$nk2-6^R=rG', 25000, 500000, 'Active'),
  ('SYMMETRY', 'HELOC', 'Jerry Sanchez', 'jerry.sanchez@symmetrylending.com', '17289008994', 'https://www.mysecuredock.com/', NULL, NULL, 50000, 1000000, 'Active'),
  ('THE LENDER', 'Non-QM', 'Chaz Scruggs', 'cscruggs@thelender.com', '19494083178', 'https://6335822308.encompasstpoconnect.com', 'yousif@mortgagebolt.com', 'Bolt2025!', 100000, 4000000, 'Active'),
  ('THE LOAN STORE', 'HELOC', 'Marcia Escobedo', 'mescobedo@theloanstore.com', '19548224344', 'https://theloanstore.encompasstpoconnect.com/', 'yousif@mortgagebolt.com', 'f7562bf5', 75000, 200000, 'Active'),
  ('UWM', 'Conventional', 'Anthony Zaitonia', 'azaitonia@uwm.com', '18106507497', 'https://uwm.com/', 'yousif@mortgagebolt.com', 'Bolt2025!!', 25000, 5000000, 'Active'),
  ('WINDSOR', 'Conventional', 'Tiffanie Workman', 'tworkman@windsormortgage.com', '13215915787', 'https://1386093445.encompasstpoconnect.com/', 'yousif@mortgagebolt.com', 'd74aa99d', 75000, 3000000, 'Active');