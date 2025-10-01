import React from "react";
import "./ChuyenTrang.css";

export default function ChuyenTrang({
  totalPages,
  currentPage,
  setCurrentPage,
  jumpPage,
  setJumpPage,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="chuyentrang-pagination">
      {/* Nút trước */}
      <button
        onClick={() => {
          const newPage = Math.max(currentPage - 1, 1);
          setCurrentPage(newPage);
          setJumpPage(newPage);
        }}
        disabled={currentPage === 1}
        className="chuyentrang-pageBtn"
      >
        &lt; Trước
      </button>

      {/* Các nút số trang */}
      {[...Array(totalPages)].map((_, i) => {
        const page = i + 1;
        if (
          page === 1 ||
          page === totalPages ||
          (page >= currentPage - 1 && page <= currentPage + 1)
        ) {
          return (
            <button
              key={page}
              onClick={() => {
                setCurrentPage(page);
                setJumpPage(page);
              }}
              className={`chuyentrang-pageBtn ${
                currentPage === page ? "chuyentrang-activePage" : ""
              }`}
            >
              {page}
            </button>
          );
        } else if (
          (page === 2 && currentPage > 3) ||
          (page === totalPages - 1 && currentPage < totalPages - 2)
        ) {
          return <span key={page}>...</span>;
        }
        return null;
      })}

      {/* Nút sau */}
      <button
        onClick={() => {
          const newPage = Math.min(currentPage + 1, totalPages);
          setCurrentPage(newPage);
          setJumpPage(newPage);
        }}
        disabled={currentPage === totalPages}
        className="chuyentrang-pageBtn"
      >
        Sau &gt;
      </button>

      {/* Quick jump */}
      <div className="chuyentrang-quickJump">
        Chuyển đến trang:
        <input
          type="number"
          min="1"
          max={totalPages}
          value={jumpPage}
          onChange={(e) => {
            let page = parseInt(e.target.value);
            if (isNaN(page)) page = "";
            setJumpPage(page);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              let page = parseInt(jumpPage);
              if (isNaN(page)) page = 1;
              page = Math.max(1, Math.min(totalPages, page));
              setCurrentPage(page);
              setJumpPage(page);
            }
          }}
        />
        of {totalPages}
      </div>
    </div>
  );
}
