// Ghidra headless script: DecompileAllFunctions.java
// Full decompilation - export ALL functions
// Usage: -postScript DecompileAllFunctions.java <output_dir>
// @category Decompile

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;

public class DecompileAllFunctions extends GhidraScript {
    
    @Override
    public void run() throws Exception {
        String outputDir = getScriptArgs()[0];
        File dir = new File(outputDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        
        DecompInterface decomp = new DecompInterface();
        decomp.setOptions(new ghidra.app.decompiler.DecompileOptions());
        decomp.openProgram(currentProgram);
        
        FunctionIterator functions = currentProgram.getFunctionManager().getFunctions(true);
        int total = 0;
        int success = 0;
        
        // File 1: Full decompilation (all functions in one big file)
        File fullFile = new File(dir, currentProgram.getName() + "_full_decompiled.c");
        PrintWriter fullPw = new PrintWriter(new FileWriter(fullFile));
        fullPw.println("// =============================================================");
        fullPw.println("// Program: " + currentProgram.getName());
        fullPw.println("// Language: AARCH64");
        fullPw.println("// Image Base: " + currentProgram.getImageBase());
        fullPw.println("// =============================================================");
        fullPw.println();
        
        // File 2: Function list with signatures
        File funcListFile = new File(dir, currentProgram.getName() + "_functions_list.txt");
        PrintWriter funcPw = new PrintWriter(new FileWriter(funcListFile));
        
        // File 3: All strings extracted from the binary
        File stringsFile = new File(dir, currentProgram.getName() + "_strings.txt");
        PrintWriter strPw = new PrintWriter(new FileWriter(stringsFile));
        ghidra.program.model.data.DataIterator dataIter = currentProgram.getListing().getDefinedData(true);
        while (dataIter.hasNext() && !monitor.isCancelled()) {
            ghidra.program.model.data.Data data = dataIter.next();
            if (data != null && data.hasStringValue()) {
                String val = data.getDefaultValueRepresentation();
                if (val != null && val.length() >= 4) {
                    strPw.println(data.getAddress() + ": " + val);
                }
            }
        }
        strPw.close();
        
        // File 4: Cross references / imports / exports
        File xrefFile = new File(dir, currentProgram.getName() + "_xrefs.txt");
        PrintWriter xrefPw = new PrintWriter(new FileWriter(xrefFile));
        xrefPw.println("=== External Imports ===");
        ghidra.program.model.symbol.SymbolTable symTable = currentProgram.getSymbolTable();
        ghidra.program.model.symbol.SymbolIterator extIter = symTable.getExternalEntryPointIterator();
        while (extIter.hasNext() && !monitor.isCancelled()) {
            ghidra.program.model.symbol.Symbol sym = extIter.next();
            xrefPw.println(sym.getName() + " @ " + sym.getAddress());
        }
        xrefPw.println();
        xrefPw.println("=== Exports ===");
        ghidra.program.model.symbol.SymbolIterator expIter = symTable.getDefinedSymbols();
        while (expIter.hasNext() && !monitor.isCancelled()) {
            ghidra.program.model.symbol.SymType type = expIter.next().getSymbolType();
            // just listing
        }
        xrefPw.close();
        
        // Decompile ALL functions
        while (functions.hasNext() && !monitor.isCancelled()) {
            Function func = functions.next();
            String name = func.getName();
            total++;
            
            try {
                DecompileResults results = decomp.decompileFunction(func, 120, monitor);
                if (results != null && results.decompileCompleted()) {
                    String code = results.getDecompiledFunction().getC();
                    if (code != null && code.length() > 10) {
                        fullPw.println("// ==============================================================");
                        fullPw.println("// Function: " + name);
                        fullPw.println("// Address:  " + func.getEntryPoint());
                        fullPw.println("// Size:     " + (func.getBody().getNumAddresses()) + " bytes");
                        fullPw.println("// Calling:  " + func.getCallingConventionName());
                        fullPw.println("// ==============================================================");
                        fullPw.println(code);
                        fullPw.println();
                        success++;
                        
                        funcPw.println(name + " @ " + func.getEntryPoint() + " size=" + func.getBody().getNumAddresses() + " decompiled=YES");
                    } else {
                        funcPw.println(name + " @ " + func.getEntryPoint() + " size=" + func.getBody().getNumAddresses() + " decompiled=EMPTY");
                    }
                } else {
                    funcPw.println(name + " @ " + func.getEntryPoint() + " size=" + func.getBody().getNumAddresses() + " decompiled=FAILED");
                }
            } catch (Exception e) {
                funcPw.println(name + " @ " + func.getEntryPoint() + " size=" + func.getBody().getNumAddresses() + " decompiled=ERROR: " + e.getMessage());
            }
            
            if (total % 100 == 0) {
                println("Progress: " + total + " functions processed...");
            }
        }
        
        fullPw.close();
        funcPw.close();
        decomp.dispose();
        
        println("=== DONE ===");
        println("Total functions: " + total);
        println("Successfully decompiled: " + success);
        println("Output dir: " + dir.getAbsolutePath());
        println("Files:");
        println("  - " + fullFile.getName());
        println("  - " + funcListFile.getName());
        println("  - " + stringsFile.getName());
        println("  - " + xrefFile.getName());
    }
}
