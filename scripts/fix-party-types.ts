import { db } from '../server/db';
import { partyTypes } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';

async function fixPartyTypes() {
  console.log('Updating Director and Secretary party types to isDefault=false...');
  
  const result = await db
    .update(partyTypes)
    .set({ isDefault: false })
    .where(inArray(partyTypes.value, ['director', 'secretary']))
    .returning();
  
  console.log(`Updated ${result.length} party types:`, result);
  process.exit(0);
}

fixPartyTypes().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
