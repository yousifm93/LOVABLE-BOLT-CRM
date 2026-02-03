import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PRMG condos from the Excel file
const prmgCondos = [
  { name: "Sailboat Pointe", expiration: "2026-07-03", address: "2440 Northwest 33rd St", city: "Oakland Park", zip: "33309", state: "FL", reviewType: "Full Review" },
  { name: "Villas of Bonaventure in Tract 37 South", expiration: "2026-04-23", address: "342 Fairway Circle", city: "Weston", zip: "33326", state: "FL", reviewType: "Limited Review" },
  { name: "Ocean Walk at New Smyrna Beach Building No. 18", expiration: "2026-04-14", address: "5300 S Atlantic Ave", city: "New Smyrna Beach", zip: "32169", state: "FL", reviewType: "Full Review" },
  { name: "The Beachdrifter", expiration: "2026-07-31", address: "10 11th Ave N", city: "Jacksonville Beach", zip: "32250", state: "FL", reviewType: "Limited Review" },
  { name: "Tristan Towers", expiration: "2026-10-27", address: "1200 Fort Pickens Rd", city: "Pensacola Beach", zip: "32561", state: "FL", reviewType: "Limited Review" },
  { name: "Visconti West", expiration: "2026-07-21", address: "1275 Lake Shadow Circle", city: "Maitland", zip: "32751", state: "FL", reviewType: "Full Review" },
  { name: "Wekiva Villas", expiration: "2026-03-12", address: "209 Tomoka Trl", city: "Longwood", zip: "32779", state: "FL", reviewType: "Full Review" },
  { name: "The Townes of Southgate", expiration: "2026-09-16", address: "4818 Marks Terrace", city: "Orlando", zip: "32811", state: "FL", reviewType: "Full Review" },
  { name: "Central Park on Lee Vista", expiration: "2026-03-17", address: "9125 Lee Vista Blvd", city: "Orlando", zip: "32829", state: "FL", reviewType: "Full Review" },
  { name: "Casa Blanca", expiration: "2026-06-25", address: "701 NE 1st Ct", city: "Hallendale Beach", zip: "33009", state: "FL", reviewType: "Limited Review" },
  { name: "Las Brisas Townhouse No. 3", expiration: "2026-07-29", address: "1310 W 46th St", city: "Hialeah", zip: "33012", state: "FL", reviewType: "Limited Review" },
  { name: "Ludlum Lake Townhouses Section One", expiration: "2026-09-08", address: "7023 NW 169th St", city: "Hialeah", zip: "33015", state: "FL", reviewType: "Full Review" },
  { name: "Tropical Landing", expiration: "2026-03-24", address: "7180 NW 174th Ter", city: "Hialeah", zip: "33015", state: "FL", reviewType: "Full Review" },
  { name: "Watergate Condominium No. 2", expiration: "2026-04-30", address: "2771 Taft Street", city: "Hollywood", zip: "33020", state: "FL", reviewType: "Limited Review" },
  { name: "Hampton Isles", expiration: "2026-11-03", address: "784 Southwest 106th Ave", city: "Pembroke Pines", zip: "33025", state: "FL", reviewType: "Full Review" },
  { name: "Caribbean Isles Villas", expiration: "2026-11-12", address: "374 NE 26th Ave", city: "Homestead", zip: "33033", state: "FL", reviewType: "Full Review" },
  { name: "Caribbean Isles Villas", expiration: "2026-03-19", address: "2650 NW 3rd Dr", city: "Homestead", zip: "33033", state: "FL", reviewType: "Limited Review" },
  { name: "Lakeshore Association No. 9", expiration: "2026-12-16", address: "1280 S Franklin Ave", city: "Homestead", zip: "33034", state: "FL", reviewType: "Limited Review" },
  { name: "Keys Gate No. 5", expiration: "2026-11-06", address: "2009 SE 27 Dr", city: "Homestead", zip: "33035", state: "FL", reviewType: "Limited Review" },
  { name: "The Ocean Sounds", expiration: "2026-12-02", address: "1770 S Ocean Blvd", city: "Pompano Beach", zip: "33062", state: "FL", reviewType: "Full Review" },
  { name: "Karanda Village VI-B", expiration: "2026-08-27", address: "3665 NW 35th St", city: "Coconut Creek", zip: "33066", state: "FL", reviewType: "Full Review" },
  { name: "Edgewater Condominium", expiration: "2026-06-19", address: "8955 Wiles Road", city: "Coral Springs", zip: "33067", state: "FL", reviewType: "Full Review" },
  { name: "The Regent House", expiration: "2026-01-28", address: "5280 NW 7th St", city: "Miami", zip: "33126", state: "FL", reviewType: "Full Review" },
  { name: "El Lago", expiration: "2026-06-24", address: "5501 Northwest 7th St.", city: "Miami", zip: "33126", state: "FL", reviewType: "Limited Review" },
  { name: "Quantum on the Bay Condo North", expiration: "2026-08-21", address: "1900 N Bayshore Dr", city: "Miami", zip: "33132", state: "FL", reviewType: "Full Review" },
  { name: "Bay House Miami", expiration: "2026-07-11", address: "600 NE 27 St", city: "Miami", zip: "33137", state: "FL", reviewType: "Full Review" },
  { name: "Four Midtown Miami", expiration: "2026-04-01", address: "3301 NE 1st Ave", city: "Miami", zip: "33137", state: "FL", reviewType: "Full Review" },
  { name: "Normandy Shores Yacht and Country Club", expiration: "2026-08-13", address: "110 S Shore Dr", city: "Miami Beach", zip: "33141", state: "FL", reviewType: "Full Review" },
  { name: "Space 01", expiration: "2026-07-15", address: "7934 West Drive", city: "North Bay Village", zip: "33141", state: "FL", reviewType: "Limited Review" },
  { name: "Avila", expiration: "2026-08-19", address: "200 177th Dr", city: "Sunny Isles Beach", zip: "33160", state: "FL", reviewType: "Limited Review" },
  { name: "Brookview", expiration: "2026-03-19", address: "13500 NE 3rd Ct", city: "North Miami", zip: "33161", state: "FL", reviewType: "Limited Review" },
  { name: "The Horizons Condominium No. 5", expiration: "2026-06-24", address: "8065 SW 107th Ave", city: "Miami", zip: "33173", state: "FL", reviewType: "Full Review" },
  { name: "The Gardens of Kendall South No. 3", expiration: "2026-05-01", address: "10855 SW 112th Ave", city: "Miami", zip: "33176", state: "FL", reviewType: "Limited Review" },
  { name: "Veranda at Doral", expiration: "2026-03-14", address: "5210 NW 109th Ave", city: "Doral", zip: "33178", state: "FL", reviewType: "Full Review" },
  { name: "Versailles Plaza", expiration: "2026-11-25", address: "1820 W 53rd Street", city: "Hialeah", zip: "33178", state: "FL", reviewType: "Limited Review" },
  { name: "Landmark at Doral No. 4", expiration: "2026-01-29", address: "10229 Northwest 64th Terr", city: "Doral", zip: "33178", state: "FL", reviewType: "Limited Review" },
  { name: "Sandpiper at California Club", expiration: "2026-12-03", address: "594 NE 199th Terr", city: "Miami", zip: "33179", state: "FL", reviewType: "Full Review" },
  { name: "Christy's Place Villas & Townhomes", expiration: "2026-05-20", address: "12015 SW 14th St", city: "Miami", zip: "33184", state: "FL", reviewType: "Full Review" },
  { name: "Hammocks Trails", expiration: "2026-10-14", address: "15290 SW 106TH LN", city: "Miami", zip: "33196", state: "FL", reviewType: "Full Review" },
  { name: "Fairfax Condominium F", expiration: "2026-12-08", address: "7443 Fairfax Drive", city: "Tamarac", zip: "33309", state: "FL", reviewType: "Full Review" },
  { name: "Tuscan Villas", expiration: "2027-01-21", address: "2851 W Prospect Road", city: "Tamarac", zip: "33309", state: "FL", reviewType: "Full Review" },
  { name: "Water Bridge No. 6", expiration: "2026-08-08", address: "5985 Del Lago Cir", city: "Sunrise", zip: "33313", state: "FL", reviewType: "Limited Review" },
  { name: "Gladiola Gardens", expiration: "2026-10-04", address: "4801 NW 34th St", city: "Lauderdale Lakes", zip: "33319", state: "FL", reviewType: "Full Review" },
  { name: "Clairmont Condominium H", expiration: "2026-02-25", address: "10603 W Clairmont Cir", city: "Tamarac", zip: "33321", state: "FL", reviewType: "Full Review" },
  { name: "Lime Bay Condominium Inc. No. 2", expiration: "2026-12-03", address: "9150 Lime Bay", city: "Tamarac", zip: "33321", state: "FL", reviewType: "Limited Review" },
  { name: "Weldon Condominium D", expiration: "2026-08-05", address: "9563 Weldon Cir", city: "Tamarac", zip: "33321", state: "FL", reviewType: "Limited Review" },
  { name: "Belfort Condominium P", expiration: "2026-05-16", address: "9565 N. Belfort Cir", city: "Tamarac", zip: "33321", state: "FL", reviewType: "Limited Review" },
  { name: "Building 5 of Racquet Club Apartments at Bonaventure 7", expiration: "2026-08-20", address: "303 Racquet Club Rd", city: "Weston", zip: "33326", state: "FL", reviewType: "Full Review" },
  { name: "Racquet Club Apartments at Bonaventure 8 North", expiration: "2026-07-08", address: "305 Lakeview Dr", city: "Weston", zip: "33326", state: "FL", reviewType: "Full Review" },
  { name: "Building Seven of Country Club Apartments at Bonaventure 32", expiration: "2026-06-06", address: "16325 Golf Club Rd", city: "Weston", zip: "33326", state: "FL", reviewType: "Limited Review" },
  { name: "Paradise Villas", expiration: "2026-04-24", address: "104 Paradise Harbour Blvd", city: "North Palm Beach", zip: "33408", state: "FL", reviewType: "Full Review" },
  { name: "Cresthaven Villas No. 7", expiration: "2026-10-04", address: "2867 Ashley Dr", city: "West Palm Beach", zip: "33415", state: "FL", reviewType: "Full Review" },
  { name: "Pine Ridge North Village", expiration: "2026-10-30", address: "727 Sunny Pine Way", city: "Greenacres", zip: "33415", state: "FL", reviewType: "Full Review" },
  { name: "Pinecrest", expiration: "2026-04-04", address: "5110 Michigan Ave", city: "West Palm Beach", zip: "33415", state: "FL", reviewType: "Full Review" },
  { name: "Oleander Condominium Association", expiration: "2026-11-20", address: "5250 Las Verdes Cir", city: "Delray Beach", zip: "33418", state: "FL", reviewType: "Limited Review" },
  { name: "Legends", expiration: "2026-05-15", address: "239 Legendary Circle", city: "Palm Beach Gardens", zip: "33418", state: "FL", reviewType: "Limited Review" },
  { name: "Wellesley Park", expiration: "2026-05-07", address: "5951 Wellesley Park", city: "Boca Raton", zip: "33433", state: "FL", reviewType: "Limited Review" },
  { name: "Briella No. 3", expiration: "2025-02-29", address: "7251 Briella Drive", city: "Boynton Beach", zip: "33437", state: "FL", reviewType: "Full Review" },
  { name: "Lucente Village", expiration: "2027-01-15", address: "5217 Brisata Cir", city: "Boynton Beach", zip: "33437", state: "FL", reviewType: "Full Review" },
  { name: "Park Pointe II", expiration: "2027-01-07", address: "3236 Jog Park Dr", city: "Greenacres", zip: "33467", state: "FL", reviewType: "Full Review" },
  { name: "Lucerne Lakes Golf Colony No. 11", expiration: "2026-03-11", address: "7094 Golf Colony Ct", city: "Lake Worth", zip: "33467", state: "FL", reviewType: "Limited Review" },
  { name: "Sandpointe Bay", expiration: "2026-10-21", address: "19800 Sandpointe Bay Dr", city: "Tequesta", zip: "33469", state: "FL", reviewType: "Full Review" },
  { name: "Ocean Sound", expiration: "2026-10-20", address: "19900 Beach Rd", city: "Jupiter", zip: "33469", state: "FL", reviewType: "Limited Review" },
  { name: "Sandpointe Bay", expiration: "2026-04-07", address: "19800 Sandpointe Bay Dr", city: "Tequesta", zip: "33469", state: "FL", reviewType: "Limited Review" },
  { name: "Seagate Towers", expiration: "2026-12-16", address: "200 Macfarlane Dr", city: "Delray Beach", zip: "33483", state: "FL", reviewType: "Limited Review" },
  { name: "Capri E Condominium", expiration: "2026-05-20", address: "218 Capri E", city: "Delray Beach", zip: "33484", state: "FL", reviewType: "Full Review" },
  { name: "Banyan", expiration: "2026-12-17", address: "5100 Las Verdes Cir", city: "Delray Beach", zip: "33484", state: "FL", reviewType: "Limited Review" },
  { name: "River Oaks Condominium II", expiration: "2026-03-03", address: "5118 Puritan Cir", city: "Tampa", zip: "33617", state: "FL", reviewType: "Full Review" },
  { name: "Lake Chase", expiration: "2026-06-25", address: "10590 Windsor Lake Ct", city: "Tampa", zip: "33626", state: "FL", reviewType: "Limited Review" },
  { name: "Chateau Tower", expiration: "2026-05-29", address: "7050 Sunset Drive", city: "South Pasadena", zip: "33707", state: "FL", reviewType: "Full Review" },
  { name: "Baywatch at Harbourside", expiration: "2026-10-01", address: "7882 Sailboat Blvd", city: "South Pasadena", zip: "33707", state: "FL", reviewType: "Limited Review" },
  { name: "Bacopa Bay Owners Association", expiration: "2026-11-23", address: "4963 Bacopa Ln S", city: "St. Petersburg", zip: "33765", state: "FL", reviewType: "Limited Review" },
  { name: "51 Island Way", expiration: "2026-07-01", address: "51 Island Way", city: "Clearwater Beach", zip: "33767", state: "FL", reviewType: "Full Review" },
  { name: "700 Island Way I", expiration: "2026-06-27", address: "700 Island Way", city: "Clearwater Beach", zip: "33767", state: "FL", reviewType: "Full Review" },
  { name: "Golden Shores", expiration: "2026-09-19", address: "19531 Gulf Blvd", city: "Indian Shores", zip: "33785", state: "FL", reviewType: "Full Review" },
  { name: "South Pointe Villas Phase IV", expiration: "2026-04-22", address: "6300 S Pointe Blvd", city: "Fort Myers", zip: "33919", state: "FL", reviewType: "Limited Review" },
  { name: "Deauville of Naples", expiration: "2026-07-11", address: "5733 Deauville Circle", city: "Naples", zip: "34112", state: "FL", reviewType: "Limited Review" },
  { name: "Spanish Harbor", expiration: "2026-07-02", address: "9395 Pennsylvania Ave", city: "Bonita Springs", zip: "34135", state: "FL", reviewType: "Full Review" },
  { name: "Palm-Aire at Sarasota C", expiration: "2026-03-14", address: "7061 W Country Club Dr", city: "Sarasota", zip: "34243", state: "FL", reviewType: "Limited Review" },
  { name: "Waterford at Palm Harbor", expiration: "2026-06-02", address: "3607 Trafalgar Way", city: "Palm Harbor", zip: "34685", state: "FL", reviewType: "Full Review" },
  { name: "Water Street at Celebration", expiration: "2026-03-28", address: "516 Water St", city: "Celebration", zip: "34747", state: "FL", reviewType: "Full Review" },
];

// Normalize text for comparison
function normalizeText(text: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,#]/g, "")
    .replace(/\bst\b/g, "street")
    .replace(/\bave\b/g, "avenue")
    .replace(/\bblvd\b/g, "boulevard")
    .replace(/\bdr\b/g, "drive")
    .replace(/\brd\b/g, "road")
    .replace(/\bln\b/g, "lane")
    .replace(/\bcir\b/g, "circle")
    .replace(/\bter\b|\bterr\b/g, "terrace")
    .replace(/\bct\b/g, "court")
    .replace(/\bpl\b/g, "place")
    .replace(/\bnw\b/g, "northwest")
    .replace(/\bne\b/g, "northeast")
    .replace(/\bsw\b/g, "southwest")
    .replace(/\bse\b/g, "southeast")
    .replace(/\bn\b/g, "north")
    .replace(/\bs\b/g, "south")
    .replace(/\be\b/g, "east")
    .replace(/\bw\b/g, "west");
}

// Map review type from PRMG format to our format
function mapReviewType(prmgType: string): string {
  if (prmgType.toLowerCase().includes("full")) {
    return "Conventional Full";
  } else if (prmgType.toLowerCase().includes("limited")) {
    return "Conventional Limited";
  }
  return "Conventional Full"; // default
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all existing condos
    let allCondos: any[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from("condos")
        .select("id, condo_name, street_address, city, zip")
        .is("deleted_at", null)
        .range(offset, offset + PAGE_SIZE - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allCondos = [...allCondos, ...data];
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) break;
    }

    console.log(`Loaded ${allCondos.length} existing condos`);

    // Create lookup maps for matching
    const nameMap = new Map<string, any>();
    const addressMap = new Map<string, any>();
    
    for (const condo of allCondos) {
      const normalizedName = normalizeText(condo.condo_name);
      if (normalizedName) {
        nameMap.set(normalizedName, condo);
      }
      
      const addressKey = `${normalizeText(condo.street_address)}|${normalizeText(condo.city)}|${condo.zip || ""}`;
      if (condo.street_address) {
        addressMap.set(addressKey, condo);
      }
    }

    let inserted = 0;
    let updated = 0;
    const results: any[] = [];

    for (const prmgCondo of prmgCondos) {
      const normalizedName = normalizeText(prmgCondo.name);
      const addressKey = `${normalizeText(prmgCondo.address)}|${normalizeText(prmgCondo.city)}|${prmgCondo.zip || ""}`;
      
      // Try to find a match
      let existingCondo = nameMap.get(normalizedName);
      if (!existingCondo) {
        existingCondo = addressMap.get(addressKey);
      }
      
      if (existingCondo) {
        // Update existing condo - set source_prmg = true
        const { error } = await supabase
          .from("condos")
          .update({ 
            source_prmg: true,
            approval_expiration_date: prmgCondo.expiration,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingCondo.id);
        
        if (error) {
          console.error(`Error updating ${prmgCondo.name}:`, error);
        } else {
          updated++;
          results.push({ action: "updated", name: prmgCondo.name, matchedWith: existingCondo.condo_name });
        }
      } else {
        // Insert new condo
        const { error } = await supabase
          .from("condos")
          .insert({
            condo_name: prmgCondo.name,
            street_address: prmgCondo.address,
            city: prmgCondo.city,
            state: prmgCondo.state,
            zip: prmgCondo.zip,
            source_prmg: true,
            review_type: mapReviewType(prmgCondo.reviewType),
            approval_expiration_date: prmgCondo.expiration,
          });
        
        if (error) {
          console.error(`Error inserting ${prmgCondo.name}:`, error);
        } else {
          inserted++;
          results.push({ action: "inserted", name: prmgCondo.name });
        }
      }
    }

    const summary = {
      total: prmgCondos.length,
      inserted,
      updated,
      message: `Imported ${inserted} new condos and updated ${updated} existing condos with PRMG approval`,
      results
    };

    console.log("Import complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in import-prmg-condos:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
