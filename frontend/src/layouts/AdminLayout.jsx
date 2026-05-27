import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Fixed sidebar - stays on all scrolls */}
      <AdminSidebar />

      {/* 
        Sidebar width is controlled by CSS variable from AdminSidebar.
        Expanded = 240px, Collapsed = 72px.
        This fixes the issue where content still keeps full ml-64 space after hiding.
      */}
      <div
        className="flex-1 min-w-0 overflow-x-auto transition-all duration-300 ease-in-out"
        style={{ marginLeft: "var(--admin-sidebar-width, 240px)" }}
      >
        {children}
      </div>
    </div>
  );
}