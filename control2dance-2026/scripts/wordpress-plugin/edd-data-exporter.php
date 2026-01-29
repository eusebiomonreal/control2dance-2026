<?php
/**
 * Plugin Name: EDD Data Exporter for Control2Dance
 * Description: Exporta todos los datos de Easy Digital Downloads a JSON para migración
 * Version: 1.0.0
 * Author: Control2Dance
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'EDD Data Exporter',
            'EDD Export',
            'manage_options',
            'edd-data-exporter',
            [$this, 'admin_page'],
            'dashicons-download',
            100
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>📦 Exportar Datos de Easy Digital Downloads</h1>
            <p>Este plugin exportará todos los datos de EDD a un archivo JSON para migración a Control2Dance.</p>
            
            <div style="background: #fff; padding: 20px; margin: 20px 0; border-left: 4px solid #ff4d7d;">
                <h2>📊 Resumen de Datos</h2>
                <?php $this->show_data_summary(); ?>
            </div>

            <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; border: 1px solid #ccc;">
                <h3>🔍 Información de Depuración (Si algo sale 0)</h3>
                <?php $this->show_debug_info(); ?>
            </div>
            
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data">
                <?php wp_nonce_field('export_edd_data', 'export_nonce'); ?>
                
                <h3>Selecciona qué exportar:</h3>
                <p>
                    <label>
                        <input type="checkbox" name="export_products" value="1" checked>
                        <strong>Productos</strong> (Downloads)
                    </label>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="export_orders" value="1" checked>
                        <strong>Pedidos</strong> (Payments)
                    </label>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="export_customers" value="1" checked>
                        <strong>Clientes</strong>
                    </label>
                </p>
                <p>
                    <label>
                        <input type="checkbox" name="export_downloads" value="1">
                        <strong>Historial de Descargas</strong> (puede ser muy grande)
                    </label>
                </p>
                
                <p>
                    <?php submit_button('🚀 Exportar Datos a JSON', 'primary', 'submit', false); ?>
                </p>
            </form>
            
            <div style="background: #fffbcc; padding: 15px; margin: 20px 0; border-left: 4px solid #ffb900;">
                <h3>⚠️ Notas Importantes</h3>
                <ul>
                    <li>El proceso puede tardar varios minutos si tienes muchos datos</li>
                    <li>Se generará un archivo JSON que deberás descargar</li>
                    <li>Este archivo contendrá TODOS los datos, incluyendo emails de clientes</li>
                    <li>Guárdalo en un lugar seguro y elimínalo después de la migración</li>
                </ul>
            </div>
        </div>
        <?php
    }
    
    private function show_data_summary() {
        global $wpdb;
        
        // Count products
        $products_count = wp_count_posts('download');
        $total_products = $products_count->publish + $products_count->draft;
        
        // Count orders - try multiple methods
        $total_orders = 0;
        
        // Method 1: EDD 3.0+ orders table
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        if ($table_exists) {
            $total_orders = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}edd_orders");
        }
        
        // Method 2: EDD function
        if ($total_orders == 0 && function_exists('edd_count_payments')) {
            $count = edd_count_payments();
            $total_orders = isset($count->total) ? $count->total : 0;
        }
        
        // Method 3: Direct post count
        if ($total_orders == 0) {
            $total_orders = $wpdb->get_var("
                SELECT COUNT(*) 
                FROM {$wpdb->prefix}posts 
                WHERE post_type = 'edd_payment'
            ");
        }
        
        // Count customers
        $customers_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}edd_customers");
        if (!$customers_count) {
            $customers_count = 0;
        }
        
        // Count download logs - Ultra resilient check
        $downloads_count = 0;
        
        // 1. Try modern EDD 3.0+ table (plural or singular)
        $logs_table_full = $wpdb->prefix . 'edd_logs';
        $logs_table_singular = $wpdb->prefix . 'edd_log';
        $active_logs_table = '';
        
        if ($wpdb->get_var("SHOW TABLES LIKE '$logs_table_full'")) {
            $active_logs_table = $logs_table_full;
        } elseif ($wpdb->get_var("SHOW TABLES LIKE '$logs_table_singular'")) {
            $active_logs_table = $logs_table_singular;
        }
        
        if ($active_logs_table) {
            $columns = $wpdb->get_col("DESCRIBE $active_logs_table", 0);
            $type_col = in_array('type', $columns) ? 'type' : (in_array('log_type', $columns) ? 'log_type' : '');
            if ($type_col) {
                $downloads_count = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM $active_logs_table WHERE {$type_col} = %s",
                    'file_download'
                ));
            }
        }
        
        // 2. If still 0, try Legacy EDD (wp_posts with meta)
        if (!$downloads_count || $downloads_count == 0) {
            $downloads_count = $wpdb->get_var("
                SELECT COUNT(p.ID) 
                FROM {$wpdb->prefix}posts p
                INNER JOIN {$wpdb->prefix}postmeta pm ON p.ID = pm.post_id
                WHERE p.post_type = 'edd_log' 
                AND pm.meta_key = '_edd_log_type' 
                AND pm.meta_value = 'file_download'
            ");
        }
        
        // 3. If still 0, try Legacy EDD (wp_posts with taxonomy 'edd_log_type')
        if (!$downloads_count || $downloads_count == 0) {
            $downloads_count = $wpdb->get_var("
                SELECT COUNT(p.ID) 
                FROM {$wpdb->prefix}posts p
                INNER JOIN {$wpdb->prefix}term_relationships tr ON p.ID = tr.object_id
                INNER JOIN {$wpdb->prefix}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                INNER JOIN {$wpdb->prefix}terms t ON tt.term_id = t.term_id
                WHERE p.post_type = 'edd_log' 
                AND tt.taxonomy = 'edd_log_type'
                AND t.slug = 'file_download'
            ");
        }

        // 4. Try EDD Native Logging Class (very reliable for all versions)
        if ((!$downloads_count || $downloads_count == 0) && class_exists('EDD_Logging')) {
            $edd_logging = new EDD_Logging();
            $downloads_count = $edd_logging->get_log_count(0, 'file_download');
        }

        // 5. Final fallback: Any post of type edd_log
        if (!$downloads_count || $downloads_count == 0) {
            $downloads_count = $wpdb->get_var("SELECT COUNT(ID) FROM {$wpdb->prefix}posts WHERE post_type = 'edd_log'");
        }
        
        if ($downloads_count === null) {
            $downloads_count = 0;
        }
        
        // Show EDD version for debugging
        $edd_version = defined('EDD_VERSION') ? EDD_VERSION : 'Unknown';
        
        echo "<p><strong>EDD Version:</strong> $edd_version</p>";
        echo "<ul style='font-size: 16px;'>";
        echo "<li>📀 <strong>Productos:</strong> " . number_format($total_products) . "</li>";
        echo "<li>🛒 <strong>Pedidos:</strong> " . number_format($total_orders) . "</li>";
        echo "<li>👥 <strong>Clientes:</strong> " . number_format($customers_count) . "</li>";
        echo "<li>⬇️ <strong>Descargas registradas:</strong> " . number_format($downloads_count) . "</li>";
        echo "</ul>";
    }

    private function show_debug_info() {
        global $wpdb;
        
        echo "<h4>Tablas EDD encontradas:</h4><ul>";
        $tables = $wpdb->get_results("SHOW TABLES LIKE '%edd_%'", ARRAY_N);
        foreach ($tables as $table) {
            $table_name = $table[0];
            $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
            echo "<li><code>$table_name</code>: " . number_format($count) . " registros</li>";
            
            // Si es una tabla de logs, mostrar columnas
            if (strpos($table_name, 'logs') !== false) {
                $columns = $wpdb->get_col("DESCRIBE $table_name", 0);
                echo " (Columnas: " . implode(', ', $columns) . ")";
            }
        }
        echo "</ul>";

        echo "<h4>Post Types detectados:</h4><ul>";
        $post_types = $wpdb->get_results("SELECT post_type, COUNT(*) as count FROM {$wpdb->prefix}posts WHERE post_type LIKE '%edd%' GROUP BY post_type");
        if (empty($post_types)) {
            echo "<li>No se encontraron post types con 'edd'.</li>";
        }
        foreach ($post_types as $pt) {
            echo "<li><code>{$pt->post_type}</code>: " . number_format($pt->count) . " registros</li>";
            
            // Ver qué tipos de logs hay si es edd_log o similar
            if (strpos($pt->post_type, 'log') !== false) {
                $log_types = $wpdb->get_results("SELECT pm.meta_value as type, COUNT(*) as c FROM {$wpdb->prefix}postmeta pm JOIN {$wpdb->prefix}posts p ON p.ID = pm.post_id WHERE p.post_type = '{$pt->post_type}' AND (pm.meta_key = '_edd_log_type' OR pm.meta_key = 'log_type') GROUP BY pm.meta_value");
                if ($log_types) {
                    echo "<ul>";
                    foreach ($log_types as $lt) {
                        echo "<li>Meta Type: <code>" . ($lt->type ? $lt->type : 'vacío') . "</code>: {$lt->c} registros</li>";
                    }
                    echo "</ul>";
                }
            }
        }
        echo "</ul>";

        echo "<h4>Análisis de Tablas de Logs:</h4><ul>";
        $logs_tables = $wpdb->get_results("SHOW TABLES LIKE '%edd%log%'", ARRAY_N);
        foreach ($logs_tables as $table) {
            $table_name = $table[0];
            $columns = $wpdb->get_col("DESCRIBE $table_name", 0);
            echo "<li>Tabla <code>$table_name</code>:";
            
            $type_col = in_array('type', $columns) ? 'type' : (in_array('log_type', $columns) ? 'log_type' : '');
            if ($type_col) {
                $distinct_types = $wpdb->get_results("SELECT $type_col as type, COUNT(*) as c FROM $table_name GROUP BY $type_col");
                echo "<ul>";
                foreach ($distinct_types as $dt) {
                    echo "<li>Valor en <code>$type_col</code>: <code>" . ($dt->type ? $dt->type : 'vacío') . "</code>: {$dt->c} registros</li>";
                }
                echo "</ul>";
            } else {
                echo " (No se encontró columna 'type' o 'log_type')";
            }
            echo "</li>";
        }
        echo "</ul>";
    }
    
    public function handle_export() {
        // Security check
        if (!current_user_can('manage_options')) {
            wp_die('No tienes permisos para realizar esta acción');
        }
        
        check_admin_referer('export_edd_data', 'export_nonce');
        
        // Increase limits
        set_time_limit(0);
        ini_set('memory_limit', '512M');
        
        $export_data = [
            'exported_at' => current_time('mysql'),
            'site_url' => get_site_url(),
            'edd_version' => EDD_VERSION,
        ];
        
        // Export products
        if (isset($_POST['export_products'])) {
            $export_data['products'] = $this->export_products();
        }
        
        // Export orders
        if (isset($_POST['export_orders'])) {
            $export_data['orders'] = $this->export_orders();
        }
        
        // Export customers
        if (isset($_POST['export_customers'])) {
            $export_data['customers'] = $this->export_customers();
        }
        
        // Export download logs
        if (isset($_POST['export_downloads'])) {
            $export_data['download_logs'] = $this->export_download_logs();
        }
        
        // Generate JSON
        $json = json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        // Send file
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-export-' . date('Y-m-d-His') . '.json"');
        header('Content-Length: ' . strlen($json));
        echo $json;
        exit;
    }
    
    private function export_products() {
        $products = get_posts([
            'post_type' => 'download',
            'posts_per_page' => -1,
            'post_status' => ['publish', 'draft', 'pending']
        ]);
        
        $data = [];
        foreach ($products as $product) {
            $files = edd_get_download_files($product->ID);
            $categories = wp_get_post_terms($product->ID, 'download_category', ['fields' => 'names']);
            $tags = wp_get_post_terms($product->ID, 'download_tag', ['fields' => 'names']);
            
            $data[] = [
                'id' => $product->ID,
                'name' => $product->post_title,
                'slug' => $product->post_name,
                'description' => $product->post_content,
                'excerpt' => $product->post_excerpt,
                'price' => edd_get_download_price($product->ID),
                'sku' => get_post_meta($product->ID, '_edd_sku', true),
                'files' => $files,
                'cover_image' => get_the_post_thumbnail_url($product->ID, 'full'),
                'categories' => $categories,
                'tags' => $tags,
                'status' => $product->post_status,
                'created_at' => $product->post_date,
                'modified_at' => $product->post_modified,
                'download_limit' => get_post_meta($product->ID, '_edd_download_limit', true),
            ];
        }
        
        return $data;
    }
    
    private function export_orders() {
        global $wpdb;
        
        $data = [];
        
        // Check if EDD 3.0+ (has edd_orders table)
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        
        if ($table_exists) {
            // EDD 3.0+ - use new tables with JOIN to get customer info properly
            $orders = $wpdb->get_results("
                SELECT o.*, c.name as real_customer_name, c.email as real_customer_email
                FROM {$wpdb->prefix}edd_orders o
                LEFT JOIN {$wpdb->prefix}edd_customers c ON o.customer_id = c.id
                ORDER BY o.id DESC
            ");
            
            foreach ($orders as $order) {
                // Get order items
                $items = $wpdb->get_results($wpdb->prepare("
                    SELECT * FROM {$wpdb->prefix}edd_order_items
                    WHERE order_id = %d
                ", $order->id));
                
                $order_items = [];
                foreach ($items as $item) {
                    $order_items[] = [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'quantity' => $item->quantity,
                        'price' => $item->amount,
                        'subtotal' => $item->subtotal,
                        'tax' => $item->tax,
                    ];
                }
                
                $data[] = [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer_email' => !empty($order->real_customer_email) ? $order->real_customer_email : $order->email,
                    'customer_name' => !empty($order->real_customer_name) ? $order->real_customer_name : $order->name,
                    'total' => $order->total,
                    'subtotal' => $order->subtotal,
                    'tax' => $order->tax,
                    'status' => $order->status,
                    'payment_method' => $order->gateway,
                    'transaction_id' => $order->transaction_id,
                    'ip_address' => $order->ip,
                    'user_agent' => '', // Not stored in EDD 3.0
                    'items' => $order_items,
                    'created_at' => $order->date_created,
                    'completed_at' => $order->date_completed,
                ];
            }
        } else {
            // EDD 2.x - use old method
            $orders = edd_get_payments([
                'number' => -1,
                'status' => 'any'
            ]);
            
            foreach ($orders as $order) {
                $payment = new EDD_Payment($order->ID);
                
                $data[] = [
                    'id' => $order->ID,
                    'order_number' => $payment->number,
                    'customer_email' => $payment->email,
                    'customer_name' => $payment->first_name . ' ' . $payment->last_name,
                    'total' => $payment->total,
                    'subtotal' => $payment->subtotal,
                    'tax' => $payment->tax,
                    'status' => $payment->status,
                    'payment_method' => $payment->gateway,
                    'transaction_id' => $payment->transaction_id,
                    'ip_address' => $payment->ip,
                    'user_agent' => get_post_meta($order->ID, '_edd_payment_user_agent', true),
                    'items' => $this->get_order_items($payment),
                    'created_at' => $payment->date,
                    'completed_at' => $payment->completed_date,
                ];
            }
        }
        
        return $data;
    }
    
    private function get_order_items($payment) {
        $cart_items = $payment->cart_details;
        $items = [];
        
        if (!empty($cart_items)) {
            foreach ($cart_items as $item) {
                $items[] = [
                    'product_id' => $item['id'],
                    'product_name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                    'tax' => isset($item['tax']) ? $item['tax'] : 0,
                ];
            }
        }
        
        return $items;
    }
    
    private function export_customers() {
        global $wpdb;
        
        $customers = $wpdb->get_results("
            SELECT * FROM {$wpdb->prefix}edd_customers
            ORDER BY id ASC
        ");
        
        $data = [];
        foreach ($customers as $customer) {
            $data[] = [
                'id' => $customer->id,
                'user_id' => $customer->user_id,
                'email' => $customer->email,
                'name' => $customer->name,
                'purchase_count' => $customer->purchase_count,
                'purchase_value' => $customer->purchase_value,
                'created_at' => $customer->date_created,
            ];
        }
        
        return $data;
    }
    
    private function export_download_logs() {
        global $wpdb;
        $data = [];
        
        // 1. Try modern EDD 3.0+ table
        $logs_table_full = $wpdb->prefix . 'edd_logs';
        if ($wpdb->get_var("SHOW TABLES LIKE '$logs_table_full'")) {
            $column_type = $wpdb->get_col("DESCRIBE $logs_table_full", 0);
            $type_col = in_array('type', $column_type) ? 'type' : 'log_type';
            $date_col = in_array('date_created', $column_type) ? 'date_created' : 'log_date';
            $id_col = in_array('id', $column_type) ? 'id' : 'log_id';

            $logs = $wpdb->get_results("
                SELECT * FROM $logs_table_full
                WHERE {$type_col} = 'file_download'
                ORDER BY {$id_col} DESC
                LIMIT 10000
            ", ARRAY_A);
            
            foreach ($logs as $log) {
                $log_id = isset($log[$id_col]) ? $log[$id_col] : 0;
                $meta = [];
                
                if (isset($log['log_meta'])) {
                    $meta = maybe_unserialize($log['log_meta']);
                } else {
                    $meta_results = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->prefix}edd_logmeta WHERE edd_log_id = %d", $log_id));
                    if ($meta_results) {
                        foreach ($meta_results as $m) {
                            $meta[$m->meta_key] = maybe_unserialize($m->meta_value);
                        }
                    }
                }
                
                $data[] = [
                    'id' => $log_id,
                    'user_id' => isset($log['user_id']) ? $log['user_id'] : 0,
                    'customer_id' => isset($meta['customer_id']) ? $meta['customer_id'] : (isset($log['customer_id']) ? $log['customer_id'] : null),
                    'product_id' => isset($meta['download_id']) ? $meta['download_id'] : null,
                    'file_id' => isset($meta['file_id']) ? $meta['file_id'] : null,
                    'ip_address' => isset($meta['ip']) ? $meta['ip'] : (isset($log['ip']) ? $log['ip'] : null),
                    'downloaded_at' => isset($log[$date_col]) ? $log[$date_col] : null,
                ];
            }
        }
        
        // 2. If empty, try EDD Native Logging Class
        if (empty($data) && class_exists('EDD_Logging')) {
            $edd_logging = new EDD_Logging();
            $logs = $edd_logging->get_logs(0, 'file_download', 0, 10000);
            if ($logs) {
                foreach ($logs as $log) {
                    $log_id = $log->ID;
                    $data[] = [
                        'id' => $log_id,
                        'user_id' => $log->post_author,
                        'customer_id' => get_post_meta($log_id, '_edd_log_customer_id', true),
                        'product_id' => get_post_meta($log_id, '_edd_log_download_id', true),
                        'file_id' => get_post_meta($log_id, '_edd_log_file_id', true),
                        'ip_address' => get_post_meta($log_id, '_edd_log_ip', true),
                        'downloaded_at' => $log->post_date,
                    ];
                }
            }
        }

        // 3. If still empty, try Legacy EDD (wp_posts directly)
        if (empty($data)) {
            $logs = $wpdb->get_results("
                SELECT p.ID, p.post_date, p.post_author
                FROM {$wpdb->prefix}posts p
                WHERE p.post_type = 'edd_log' 
                ORDER BY p.ID DESC
                LIMIT 10000
            ");
            
            foreach ($logs as $log) {
                $data[] = [
                    'id' => $log->ID,
                    'user_id' => $log->post_author,
                    'customer_id' => get_post_meta($log->ID, '_edd_log_customer_id', true),
                    'product_id' => get_post_meta($log->ID, '_edd_log_download_id', true),
                    'file_id' => get_post_meta($log->ID, '_edd_log_file_id', true),
                    'ip_address' => get_post_meta($log->ID, '_edd_log_ip', true),
                    'downloaded_at' => $log->post_date,
                ];
            }
        }
        
        return $data;
    }
}

// Initialize plugin
new EDD_Data_Exporter();
