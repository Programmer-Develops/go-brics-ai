"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit, startAfter, getDocs } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import { Sparkles, Briefcase, FileText, Library, Target, Send, Loader2, Copy, CheckCircle2, ChevronDown, Search, Filter } from "lucide-react";

// Bumped to 20 to make client-side searching more effective on initial load
const ITEMS_PER_PAGE = 20; 

export default function GobricsAssistant() {
  const [activeTab, setActiveTab] = useState("recommender");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [savedStatus, setSavedStatus] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const [copyStatuses, setCopyStatuses] = useState({});
  
  // Library State
  const [libraryItems, setLibraryItems] = useState([]);
  const [lastPayload, setLastPayload] = useState(null);
  
  // Pagination & Search State
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Form States
  const [track, setTrack] = useState("A");
  const [skills, setSkills] = useState("");
  const [hours, setHours] = useState("2-4");
  
  const [salesProduct, setSalesProduct] = useState("SKU-01 Kavach Shield OM");
  const [persona, setPersona] = useState("");
  
  const [contentProduct, setContentProduct] = useState("SKU-02 Vastu Dosh Pyramid");
  const [contentType, setContentType] = useState("SEO Product Description");

  // Initial Fetch (First Page)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const q = query(
          collection(db, "library"), 
          orderBy("createdAt", "desc"),
          limit(ITEMS_PER_PAGE)
        );

        const documentSnapshots = await getDocs(q);
        
        const items = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLibraryItems(items);

        // Save the last visible document for the next page
        const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        setLastVisible(lastVisibleDoc);
        
        // If we fetched fewer items than the limit, there is no more data
        if (documentSnapshots.docs.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        } else {
           setHasMore(true);
        }

      } catch (error) {
        console.error("Error fetching initial library items:", error);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch Next Page
  const fetchMore = async () => {
    if (!lastVisible || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "library"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );

      const documentSnapshots = await getDocs(q);
      
      const newItems = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLibraryItems(prev => [...prev, ...newItems]);

      // Update the last visible document
      const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(newLastVisible);

      if (documentSnapshots.docs.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
       console.error("Error fetching more items:", error);
    }
    setLoadingMore(false);
  };

  const handleGenerate = async (action) => {
    setLoading(true);
    setOutput("");
    setSavedStatus(false);

    let displayPayload = {};
    if (action === "recommender") displayPayload = { Track: track, Skills: skills, Hours: hours };
    if (action === "sales") displayPayload = { Product: salesProduct, Persona: persona };
    if (action === "content") displayPayload = { Product: contentProduct, Type: contentType };
    setLastPayload(displayPayload);

    let apiPayload = {};
    if (action === "recommender") apiPayload = { track, skills, hours };
    if (action === "sales") apiPayload = { product: salesProduct, persona };
    if (action === "content") apiPayload = { product: contentProduct, type: contentType };

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload: apiPayload })
      });
      const data = await res.json();
      setOutput(data.result);
    } catch (err) {
      setOutput("Error connecting to AI.");
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) {
      console.error("Error copying to clipboard", err);
    }
  };

  // Push to Firebase and update local state to avoid full refetch
  const saveToLibrary = async (title, type) => {
    try {
      const docRef = await addDoc(collection(db, "library"), {
        title,
        type,
        content: output,
        context: lastPayload,
        createdAt: serverTimestamp()
      });
      
      setSavedStatus(true);
      
      // Optimistically update the UI to show the new item at the top
      const newItem = {
          id: docRef.id,
          title,
          type,
          content: output,
          context: lastPayload,
          createdAt: { toDate: () => new Date() } // Mocking Firebase timestamp for immediate render
      };
      setLibraryItems(prev => [newItem, ...prev]);

    } catch (err) {
      console.error("Error saving to Firestore", err);
    }
  };

  const copyLibraryItem = async (id, text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatuses(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopyStatuses(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error("Error copying library item", err);
    }
  };

  // Filter and Search Logic
  const displayedItems = libraryItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (item.content && item.content.toLowerCase().includes(searchLower)) ||
      (item.context && JSON.stringify(item.context).toLowerCase().includes(searchLower));
    
    const matchesFilter = filterType === "all" || item.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row max-w-7xl mx-auto p-4 gap-6">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 space-y-2">
        <div className="bg-slate-900 text-white p-4 rounded-xl mb-6 shadow-md flex items-center gap-2">
          <Sparkles className="text-yellow-400 w-5 h-5" />
          <h1 className="font-bold">GO-BRICS AI Ops</h1>
        </div>
        
        <NavButton active={activeTab === 'recommender'} onClick={() => setActiveTab('recommender')} icon={<Target className="w-4 h-4"/>} label="Task Recommender" />
        <NavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<Briefcase className="w-4 h-4"/>} label="B2B Scripts (S02)" />
        <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<FileText className="w-4 h-4"/>} label="Content Gen (C02)" />
        <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Library className="w-4 h-4"/>} label="Cohort Library" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 min-h-[600px]">
        
        {/* Recommender Tab */}
        {activeTab === "recommender" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800">AI Task Recommender</h2>
            <select value={track} onChange={(e) => setTrack(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 text-sm text-slate-600">
              <option value="A">Track A - Sales</option>
              <option value="B">Track B - Projects</option>
            </select>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Your Skills (e.g., Python, Video Editing)" className="w-full p-3 border rounded-lg bg-slate-50 text-sm text-slate-600"/>
            <button onClick={() => handleGenerate("recommender")} className="bg-slate-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-slate-800">
              {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4"/>} Recommend Tasks
            </button>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === "sales" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800">B2B Outreach Generator</h2>
            <select value={salesProduct} onChange={(e) => setSalesProduct(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 text-sm text-slate-600">
              <option value="SKU-01 Kavach Shield OM">SKU-01: Kavach Shield OM</option>
              <option value="SKU-02 Vastu Dosh Pyramid">SKU-02: Vastu Dosh Pyramid</option>
              <option value="SKU-03 Rudra-Shila Raksha Mala">SKU-03: Rudra-Shila Raksha Mala</option>
              <option value="SKU-04 Amrit Jal Shuddhi Set">SKU-04: Amrit Jal Shuddhi Set</option>
              <option value="SKU-05 Shila Raksha Pendant OM">SKU-05: Shila Raksha Pendant OM</option>
            </select>
            <input value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="Target Persona (e.g., Yoga Studio Owner)" className="w-full p-3 border rounded-lg bg-slate-50 text-sm text-slate-600"/>
            <button onClick={() => handleGenerate("sales")} disabled={!persona} className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4"/>} Generate Scripts
            </button>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800">Content Brief Generator</h2>
            <select value={contentProduct} onChange={(e) => setContentProduct(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 text-sm text-slate-600">
              <option value="SKU-01 Kavach Shield OM">SKU-01: Kavach Shield OM</option>
              <option value="SKU-02 Vastu Dosh Pyramid">SKU-02: Vastu Dosh Pyramid</option>
              <option value="SKU-03 Rudra-Shila Raksha Mala">SKU-03: Rudra-Shila Raksha Mala</option>
              <option value="SKU-04 Amrit Jal Shuddhi Set">SKU-04: Amrit Jal Shuddhi Set</option>
              <option value="SKU-05 Shila Raksha Pendant OM">SKU-05: Shila Raksha Pendant OM</option>
            </select>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 text-sm text-slate-600">
              <option>SEO Product Description</option>
              <option>3x Social Media Posts</option>
              <option>Blog Article Outline</option>
            </select>
            <button onClick={() => handleGenerate("content")} className="bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-purple-700">
              {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <FileText className="w-4 h-4"/>} Generate Content
            </button>
          </div>
        )}

        {/* Output Display */}
        {activeTab !== "library" && output && (
          <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 p-3 flex justify-between items-center border-b gap-2">
              <span className="font-semibold text-slate-600">AI Output</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="text-sm px-3 py-1 rounded-lg bg-slate-900 text-white flex items-center gap-1 hover:bg-slate-800"
                >
                  <Copy className="w-4 h-4" />
                  {copyStatus ? 'Copied' : 'Copy'}
                </button>
                <button 
                  onClick={() => saveToLibrary(`${activeTab} Asset`, activeTab)}
                  disabled={savedStatus}
                  className={`text-sm px-3 py-1 rounded-lg flex items-center gap-1 ${savedStatus ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {savedStatus ? <CheckCircle2 className="w-4 h-4"/> : <Library className="w-4 h-4"/>} 
                  {savedStatus ? 'Saved to Cohort' : 'Share with Cohort'}
                </button>
              </div>
            </div>
            <div className="p-6 prose max-w-none text-sm text-slate-800">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Library Tab with Search, Filter & Pagination */}
        {activeTab === "library" && (
          <div>
            <div className="mb-6 border-b pb-6">
               <h2 className="text-2xl font-bold text-slate-800 mb-1">Global Cohort Library</h2>               
               {/* Search and Filter UI */}
               <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative flex-1">
                   <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                   <input 
                     type="text" 
                     placeholder="Search outputs, personas, or products..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 shadow-sm"
                   />
                 </div>
                 <div className="relative">
                   <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                   <select 
                     value={filterType}
                     onChange={(e) => setFilterType(e.target.value)}
                     className="w-full sm:w-auto pl-9 pr-8 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 shadow-sm appearance-none cursor-pointer"
                   >
                     <option value="all">All Modules</option>
                     {/* FIXED: Removed the word "Asset" from these values to match Firebase types perfectly */}
                     <option value="recommender">Task Recommender</option>
                     <option value="sales">B2B Scripts</option>
                     <option value="content">Content Briefs</option>
                   </select>
                 </div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              {displayedItems.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                   <p className="text-slate-500 font-medium">No artifacts match your search.</p>
                   <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or loading more history.</p>
                </div>
              ) : (
                displayedItems.map(item => (
                  <div key={item.id} className="border border-slate-200 p-5 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                        {item.type}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyLibraryItem(item.id, item.content)}
                          className="text-xs px-2 py-1 rounded-full bg-slate-900 text-white flex items-center gap-2 hover:bg-slate-800"
                        >
                          <Copy className="w-3 h-3" />
                          {copyStatuses[item.id] ? 'Copied' : 'Copy'}
                        </button>
                        <span className="text-xs font-medium text-slate-400">
                          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString([], {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {item.context && (
                      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
                        {Object.entries(item.context).map(([key, value]) => (
                          value ? (
                            <span key={key} className="text-xs font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200">
                              <span className="text-slate-400 mr-1">{key}:</span>{value}
                            </span>
                          ) : null
                        ))}
                      </div>
                    )}

                    <div className="prose prose-sm max-w-none text-slate-700 line-clamp-3 cursor-pointer group" onClick={(e) => {
                      const contentDiv = e.currentTarget;
                      contentDiv.classList.toggle("line-clamp-3");
                      contentDiv.classList.toggle("line-clamp-none");
                    }}>
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                      <div className="mt-2 text-xs text-blue-500 font-medium opacity-0 group-[.line-clamp-3]:opacity-100 transition-opacity flex items-center gap-1">
                        Click to expand <ChevronDown className="w-3 h-3"/>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Pagination Controls */}
              {hasMore && (
                <div className="flex justify-center mt-6 pt-4">
                  <button 
                    onClick={fetchMore} 
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-full hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin"/> : <ChevronDown className="w-4 h-4"/>}
                    {loadingMore ? "Searching..." : "Load More Artifacts"}
                  </button>
                </div>
              )}
              
              {!hasMore && libraryItems.length > 0 && (
                 <div className="text-center mt-8 text-xs text-slate-400 font-medium">
                    End of library history.
                 </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      {icon} {label}
    </button>
  );
}