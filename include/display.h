#ifndef DISPLAY_H
#define DISPLAY_H

#include <iostream>
#include <vector>
#include <homebrew_include/GL/glew.h>
#include <homebrew_include/GLFW/glfw3.h>
#include "common.h"

class Display {
    uint32_t _dispWidth;
    uint32_t _dispHeight;
    GLFWwindow *_mainWindow;
    GLuint VBO, VAO, shader;
    Display() = delete;
    Display(const Display&) = delete;
public:
    Display(uint32_t width, uint32_t height);
    void get_resolution(uint32_t *width, uint32_t *height) const;
    void start_display();
    void mark(Point point, uint32_t color);
    void clear(Point point);
private:
    void CreateTriangle();
    void AddShader(GLuint theProgram, const char* shaderCode, GLenum shaderType);
    void CompileShaders();
    void CreateLine(const Point& a, const Point& b);
};

#endif // !DISPLAY_H