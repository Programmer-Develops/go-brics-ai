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
  const [libraryItems, setLibraryItems] = useState([]);

  // Form States
  const [track, setTrack] = useState("A");
  const [skills, setSkills] = useState("");
  const [hours, setHours] = useState("2-4");
  
  const [salesProduct, setSalesProduct] = useState("SKU-01 Kavach Shield OM");
  const [persona, setPersona] = useState("");
  
  const [contentProduct, setContentProduct] = useState("SKU-02 Vastu Dosh Pyramid");
  const [contentType, setContentType] = useState("SEO Product Description");

  // Fetch Team Library from Firebase
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

    let payload = {};
    if (action === "recommender") payload = { track, skills, hours };
    if (action === "sales") payload = { product: salesProduct, persona };
    if (action === "content") payload = { product: contentProduct, type: contentType };

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      const data = await res.json();
      setOutput(data.result);
    } catch (err) {
      setOutput("Error connecting to AI.");
    }
    setLoading(false);
  };

  const saveToLibrary = async (title, type) => {
    try {
      await addDoc(collection(db, "library"), {
        title,
        type,
        content: output,
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
        
        <NavButton active={activeTab === 'recommender'} onClick={() => setActiveTab('recommender')} icon={<Target/>} label="Task Recommender" />
        <NavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<Briefcase/>} label="B2B Scripts (S02)" />
        <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<FileText/>} label="Content Gen (C02)" />
        <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Library/>} label="Team Library" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 min-h-[600px]">
        
        {/* Recommender Tab */}
        {activeTab === "recommender" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800">AI Task Recommender</h2>
            <select value={track} onChange={(e) => setTrack(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 text-slate-600">
              <option value="A">Track A - Sales</option>
              <option value="B">Track B - Projects</option>
            </select>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Your Skills (e.g., Python, Video Editing)" className="w-full p-3 border rounded-lg bg-slate-50 text-slate-600"/>
            <button onClick={() => handleGenerate("recommender")} className="bg-slate-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-slate-800">
              {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4"/>} Recommend Tasks
            </button>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === "sales" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800">B2B Outreach Generator</h2>
            <input value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="Target Persona (e.g., Yoga Studio Owner)" className="w-full p-3 border rounded-lg bg-slate-50 text-slate-600"/>
            <button onClick={() => handleGenerate("sales")} disabled={!persona} className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4"/>} Generate Scripts
            </button>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800">Content Brief Generator</h2>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 text-slate-600">
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
            <div className="bg-slate-50 p-3 flex justify-between border-b">
              <span className="font-semibold text-slate-600">AI Output</span>
              <button 
                onClick={() => saveToLibrary(`${activeTab} Asset`, activeTab)}
                className={`text-sm px-3 py-1 rounded flex items-center gap-1 ${savedStatus ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white'}`}
              >
                {savedStatus ? <CheckCircle2 className="w-4 h-4"/> : <Library className="w-4 h-4"/>} 
                {savedStatus ? 'Saved to Library' : 'Save to Library'}
              </button>
            </div>
            <div className="p-6 prose max-w-none text-sm text-slate-800">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Library Tab */}
        {activeTab === "library" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Team Knowledge Library</h2>
            <div className="grid grid-cols-1 gap-4">
              {libraryItems.length === 0 ? <p className="text-slate-500">No items saved yet.</p> : null}
              {libraryItems.map(item => (
                <div key={item.id} className="border p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">{item.type}</span>
                  </div>
                  <div className="prose prose-sm line-clamp-3">
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