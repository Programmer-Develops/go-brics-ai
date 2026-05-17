"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import { Sparkles, Briefcase, FileText, Library, Target, Send, Loader2, Copy, CheckCircle2 } from "lucide-react";

export default function GobricsAssistant() {
  const [activeTab, setActiveTab] = useState("recommender");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [savedStatus, setSavedStatus] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  
  // NEW: State to remember exactly what inputs generated the current output
  const [lastPayload, setLastPayload] = useState(null);

  // Form States
  const [track, setTrack] = useState("A");
  const [skills, setSkills] = useState("");
  const [hours, setHours] = useState("2-4");
  
  const [salesProduct, setSalesProduct] = useState("SKU-01 Kavach Shield OM");
  const [persona, setPersona] = useState("");
  
  const [contentProduct, setContentProduct] = useState("SKU-02 Vastu Dosh Pyramid");
  const [contentType, setContentType] = useState("SEO Product Description");

  useEffect(() => {
    const q = query(collection(db, "library"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLibraryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleGenerate = async (action) => {
    setLoading(true);
    setOutput("");
    setSavedStatus(false);

    // Save capitalized keys for the UI badges
    let displayPayload = {};
    if (action === "recommender") displayPayload = { Track: track, Skills: skills, Hours: hours };
    if (action === "sales") displayPayload = { Product: salesProduct, Persona: persona };
    if (action === "content") displayPayload = { Product: contentProduct, Type: contentType };
    setLastPayload(displayPayload);

    // Use lowercase keys for the backend API
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

  // Push to Firebase
  const saveToLibrary = async (title, type) => {
    try {
      await addDoc(collection(db, "library"), {
        title,
        type,
        content: output,
        context: lastPayload, // NEW: Save the inputs to Firestore!
        createdAt: serverTimestamp()
      });
      setSavedStatus(true);
    } catch (err) {
      console.error("Error saving to Firestore", err);
    }
  };

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

        {/* Library Tab */}
        {activeTab === "library" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Global Cohort Library</h2>
            <div className="grid grid-cols-1 gap-4">
              {libraryItems.length === 0 ? <p className="text-slate-500">No items saved yet.</p> : null}
              {libraryItems.map(item => (
                <div key={item.id} className="border p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between mb-3">
                    <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">{item.type}</span>
                    <span className="text-xs text-slate-500">{item.createdAt?.toDate().toLocaleString() || 'Just now'}</span>
                  </div>

                  {/* NEW: Context Badges Rendering */}
                  {item.context && (
                    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                      {Object.entries(item.context).map(([key, value]) => (
                        value ? (
                          <span key={key} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            <span className="text-slate-400 mr-1">{key}:</span>{value}
                          </span>
                        ) : null
                      ))}
                    </div>
                  )}

                  {/* let user expand the content and unexpand content */}
                  <div className="prose prose-sm line-clamp-3 text-slate-700 cursor-pointer" onClick={(e) => {
                    const contentDiv = e.currentTarget;
                    contentDiv.classList.toggle("line-clamp-3");
                    contentDiv.classList.toggle("line-clamp-none");
                  }}>
                    <ReactMarkdown>{item.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
      {icon} {label}
    </button>
  );
}