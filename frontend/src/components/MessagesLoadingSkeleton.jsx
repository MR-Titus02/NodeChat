function MessagesLoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="animate-pulse space-y-2">
          {index % 3 === 0 && (
            <div className="flex justify-center">
              <div className="h-6 w-28 rounded-full bg-slate-800/80" />
            </div>
          )}

          <div className={`chat ${index % 2 === 0 ? "chat-start" : "chat-end"}`}>
            <div
              className={`chat-bubble h-14 rounded-2xl bg-slate-800/90 text-white ${
                index % 2 === 0 ? "w-40 sm:w-52" : "w-32 sm:w-44"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessagesLoadingSkeleton;
