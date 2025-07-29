export async function resetDatabase(): Promise<void> {
  const DB_NAME = 'DocumentWriterDB';
  
  return new Promise((resolve, reject) => {
    const deleteReq = indexedDB.deleteDatabase(DB_NAME);
    
    deleteReq.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };
    
    deleteReq.onerror = () => {
      console.error('Error deleting database');
      reject(new Error('Failed to delete database'));
    };
    
    deleteReq.onblocked = () => {
      console.warn('Database deletion blocked');
      // Still resolve as the database will be deleted when connections close
      resolve();
    };
  });
}