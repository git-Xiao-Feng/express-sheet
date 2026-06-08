// Command express-sheet serves the online waybill editor and PDF generator.
package main

import (
	"context"
	"embed"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/xfeng/express-sheet/internal/assets"
	"github.com/xfeng/express-sheet/internal/server"
)

// webFS 嵌入 web/ 目录以保证可执行文件自包含、与运行目录无关。
//go:embed web
var webFS embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	h := server.New(assets.SimHeiTTF, webFS)
	mux := http.NewServeMux()
	h.Register(mux)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           withLogging(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Graceful shutdown
	idleClosed := make(chan struct{})
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		<-sigCh
		log.Println("[express-sheet] 正在关闭服务...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("[express-sheet] 关闭异常: %v", err)
		}
		close(idleClosed)
	}()

	log.Printf("[express-sheet] 监听端口 :%s — 浏览器访问 http://localhost:%s", port, port)
	log.Println("[express-sheet] 路由:")
	log.Println("  GET  /                      → 主页")
	log.Println("  GET  /static/*              → 静态资源")
	log.Println("  GET  /api/template/default  → 默认模板")
	log.Println("  POST /api/pdf               → 生成 PDF(二进制流)")
	log.Println("  GET  /api/image             → 生成条码/二维码 PNG")
	log.Println("  GET  /api/health            → 健康检查")
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("[express-sheet] 启动失败: %v", err)
	}
	<-idleClosed
	log.Println("[express-sheet] 已退出")
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(sw, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, sw.status, time.Since(start))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}
