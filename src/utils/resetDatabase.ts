export async function resetDatabase(): Promise<void> {
  const DB_NAME = 'DocumentWriterDB';
  
  return new Promise((resolve, reject) => {
    const deleteReq = indexedDB.deleteDatabase(DB_NAME);
    
    deleteReq.onsuccess = () => {
      resolve();
    };
    
    deleteReq.onerror = () => {
      reject(new Error('Failed to delete database'));
    };
    
    deleteReq.onblocked = () => {
      // Still resolve as the database will be deleted when connections close
      resolve();
    };
  });
}