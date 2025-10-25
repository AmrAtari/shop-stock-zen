// src/components/DebugInventory.tsx
import React, { useEffect, useState } from 'react';

interface DebugInventoryProps {
  onDataFound?: (data: any) => void;
}

const DebugInventory: React.FC<DebugInventoryProps> = ({ onDataFound }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  const debugAllStorage = () => {
    console.log('🛠️ === COMPREHENSIVE STORAGE DEBUGGING ===');
    
    const storageData: any = {};

    // Check localStorage
    storageData.localStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          storageData.localStorage[key] = JSON.parse(value || '{}');
        } catch (e) {
          storageData.localStorage[key] = value;
        }
      }
    }

    // Check sessionStorage
    storageData.sessionStorage = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        try {
          const value = sessionStorage.getItem(key);
          storageData.sessionStorage[key] = JSON.parse(value || '{}');
        } catch (e) {
          storageData.sessionStorage[key] = value;
        }
      }
    }

    // Check IndexedDB (basic check)
    storageData.indexedDB = {
      databases: [] as string[]
    };

    // Check global variables
    storageData.globalVariables = {};
    const globalVars = ['inventory', 'storeData', 'supabase', 'queryClient'];
    globalVars.forEach(varName => {
      if ((window as any)[varName]) {
        storageData.globalVariables[varName] = (window as any)[varName];
      }
    });

    console.log('📦 Storage Debug Results:', storageData);
    setDebugInfo(storageData);
    
    if (onDataFound) {
      onDataFound(storageData);
    }

    return storageData;
  };

  const testSupabaseConnection = async () => {
    console.log('🔗 Testing Supabase connection...');
    try {
      // Check if supabase client exists
      if ((window as any).supabase) {
        const supabase = (window as any).supabase;
        console.log('✅ Supabase client found:', supabase);
        
        // Try to get session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔐 Supabase session:', session);
        console.log('❌ Supabase session error:', error);
        
        return { session, error };
      } else {
        console.log('❌ No Supabase client found in window object');
        return null;
      }
    } catch (error) {
      console.log('❌ Supabase test failed:', error);
      return null;
    }
  };

  const analyzeInventoryData = (data: any) => {
    console.log('📊 === INVENTORY DATA ANALYSIS ===');
    
    if (!data) {
      console.log('❌ No data to analyze');
      return;
    }

    // Look for inventory data in various locations
    const inventorySources = [
      { name: 'localStorage', data: data.localStorage },
      { name: 'sessionStorage', data: data.sessionStorage },
      { name: 'globalVariables', data: data.globalVariables }
    ];

    inventorySources.forEach(source => {
      console.log(`🔍 Checking ${source.name}...`);
      
      if (source.data) {
        Object.keys(source.data).forEach(key => {
          const value = source.data[key];
          
          // Check if this looks like inventory data
          if (key.includes('inventory') || key.includes('store') || key.includes('items')) {
            console.log(`✅ Found potential inventory data in ${key}:`, value);
            
            if (value && typeof value === 'object') {
              if (Array.isArray(value)) {
                console.log(`📦 ${key} is an array with ${value.length} items`);
                analyzeStores(value, key);
              } else if (value.items && Array.isArray(value.items)) {
                console.log(`📦 ${key} has items array with ${value.items.length} items`);
                analyzeStores(value.items, key);
              }
            }
          }
        });
      }
    });
  };

  const analyzeStores = (inventoryData: any[], source: string) => {
    console.log(`🏪 === STORE ANALYSIS (${source}) ===`);
    
    if (!inventoryData || !Array.isArray(inventoryData)) {
      console.log('❌ Invalid inventory data');
      return;
    }

    if (inventoryData.length === 0) {
      console.log('❌ Empty inventory array');
      return;
    }

    const stores: { [key: string]: { count: number; items: any[]; sample: any } } = {};
    
    inventoryData.forEach((item, index) => {
      // Try different possible store ID fields
      const storeId = item.storeId || item.store_id || item.store?.id || item.store || 'unknown';
      
      if (!stores[storeId]) {
        stores[storeId] = { 
          count: 0, 
          items: [],
          sample: item // Keep a sample item for inspection
        };
      }
      
      stores[storeId].count++;
      stores[storeId].items.push({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity
      });
    });

    console.log(`📈 Store Breakdown for ${source}:`, stores);
    console.log(`🏪 Total stores found: ${Object.keys(stores).length}`);
    console.log(`📦 Total items: ${inventoryData.length}`);
    
    // Log first few items for inspection
    console.log('🔍 Sample items:');
    inventoryData.slice(0, 3).forEach((item, index) => {
      console.log(`   Item ${index}:`, item);
    });
  };

  useEffect(() => {
    // Run initial debug when component mounts
    const storageData = debugAllStorage();
    analyzeInventoryData(storageData);
    testSupabaseConnection();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #e53e3e', 
      borderRadius: '8px',
      backgroundColor: '#fed7d7',
      margin: '10px 0',
      fontFamily: 'monospace'
    }}>
      <h3 style={{ color: '#c53030', marginBottom: '15px' }}>🛠️ Inventory Debug Panel</h3>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
        <button 
          onClick={() => debugAllStorage()}
          style={{ padding: '8px 12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Debug Storage
        </button>
        <button 
          onClick={() => testSupabaseConnection()}
          style={{ padding: '8px 12px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Supabase
        </button>
        <button 
          onClick={() => analyzeInventoryData(debugInfo)}
          style={{ padding: '8px 12px', backgroundColor: '#d69e2e', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Analyze Data
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#4a5568' }}>
        <p><strong>Local Storage Keys:</strong> {Object.keys(debugInfo.localStorage || {}).join(', ') || 'None'}</p>
        <p><strong>Session Storage Keys:</strong> {Object.keys(debugInfo.sessionStorage || {}).join(', ') || 'None'}</p>
        <p><strong>Global Variables:</strong> {Object.keys(debugInfo.globalVariables || {}).join(', ') || 'None'}</p>
      </div>

      <details style={{ marginTop: '15px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Raw Debug Data</summary>
        <pre style={{ 
          backgroundColor: '#2d3748', 
          color: '#e2e8f0', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '300px',
          fontSize: '10px'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default DebugInventory;
